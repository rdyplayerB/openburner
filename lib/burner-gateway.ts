import { HaloGateway } from "@arx-research/libhalo/api/web";
import QRCode from "qrcode";
import { scanCardKeys } from "./card/keys";
import { log } from "./log";
import type { BurnerKeyInfo } from "./burner";

export type { BurnerKeyInfo };

export interface GatewayPairInfo {
  execURL: string;
  qrCodeDataURL: string;
}

// Global gateway instance for persistence
let globalGateway: HaloGateway | null = null;

/**
 * Get the global gateway instance
 */
export function getGlobalGateway(): HaloGateway {
  if (!globalGateway) {
    throw new Error("Gateway not initialized. Please connect to wallet first.");
  }
  return globalGateway;
}

// ─── Session resilience ──────────────────────────────────────────────────
//
// The gateway has two links: this desktop tab ↔ server (the "requestor"
// socket, which we control) and the phone ↔ server (the "executor"). By
// default libhalo closes our requestor socket 3s after the phone drops
// (screen lock / backgrounded tab), which destroys the session and forces a
// brand-new QR scan. We cancel that timer so the session survives the phone
// being briefly asleep — when it reconnects to the same session, signing
// resumes with no re-pairing. Each signature still needs a physical card tap.

export type GatewayConnState = "connected" | "executor-away" | "closed";

interface SessionResilience {
  getState: () => GatewayConnState;
  waitForExecutor: (timeoutMs: number) => Promise<void>;
  onStateChange: (cb: (s: GatewayConnState) => void) => () => void;
}

let resilience: SessionResilience | null = null;

function installSessionResilience(gateway: HaloGateway): SessionResilience {
  // libhalo marks ws/closeTimeout as TS-private; they're plain props at runtime.
  const g = gateway as any;
  let state: GatewayConnState = "closed";
  const listeners = new Set<(s: GatewayConnState) => void>();

  const setState = (s: GatewayConnState) => {
    if (s === state) return;
    state = s;
    log.debug(`[Gateway] Connection state: ${s}`);
    listeners.forEach((cb) => {
      try {
        cb(s);
      } catch {
        /* listener errors are non-fatal */
      }
    });
  };

  const cancelAutoClose = () => {
    if (g.closeTimeout !== null && g.closeTimeout !== undefined) {
      clearTimeout(g.closeTimeout);
      g.closeTimeout = null;
    }
  };

  g.ws.onUnpackedMessage.addListener((data: any) => {
    if (data?.type === "executor_connected") {
      cancelAutoClose();
      setState("connected");
    } else if (data?.type === "executor_disconnected") {
      // Keep the requestor socket open so the same session can be resumed.
      cancelAutoClose();
      setState("executor-away");
    }
  });

  g.ws.onClose.addListener(() => setState("closed"));

  const onStateChange = (cb: (s: GatewayConnState) => void) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  };

  const waitForExecutor = (timeoutMs: number) =>
    new Promise<void>((resolve, reject) => {
      if (state === "connected") return resolve();
      if (state === "closed") return reject(new Error("GATEWAY_SESSION_CLOSED"));
      let unsub = () => {};
      const timer = setTimeout(() => {
        unsub();
        reject(new Error("GATEWAY_EXECUTOR_TIMEOUT"));
      }, timeoutMs);
      unsub = onStateChange((s) => {
        if (s === "connected") {
          clearTimeout(timer);
          unsub();
          resolve();
        } else if (s === "closed") {
          clearTimeout(timer);
          unsub();
          reject(new Error("GATEWAY_SESSION_CLOSED"));
        }
      });
    });

  return { getState: () => state, waitForExecutor, onStateChange };
}

/** Current gateway link state, or "closed" if no session is active. */
export function getGatewayConnectionState(): GatewayConnState {
  return resilience ? resilience.getState() : "closed";
}

/** Subscribe to gateway connection-state changes. Returns an unsubscribe fn. */
export function onGatewayStateChange(
  cb: (s: GatewayConnState) => void
): () => void {
  if (!resilience) return () => {};
  return resilience.onStateChange(cb);
}

// Wait this long for the phone to be present before sending a command.
const EXECUTOR_WAIT_MS = 120_000;
// Once a command is in flight, if the phone drops, give the user this long to
// reload the gateway page (which resumes the same session and replays the
// command) before we give up and close the session.
const INFLIGHT_AWAY_MS = 90_000;

/**
 * Run a gateway command, tolerating the phone briefly dropping off.
 *
 * - Waits for the executor to be present before sending.
 * - If the phone drops while the command is in flight, waits up to
 *   INFLIGHT_AWAY_MS for it to return (a phone-side page reload reconnects to
 *   the same session and libhalo replays the command), then closes the session
 *   so we surface a clear error instead of hanging forever.
 */
async function execHaloCmdResilient(
  gate: HaloGateway,
  command: Record<string, unknown>
): Promise<any> {
  if (resilience) await resilience.waitForExecutor(EXECUTOR_WAIT_MS);

  const g = gate as any;
  let awayTimer: ReturnType<typeof setTimeout> | null = null;
  const armAwayClose = () => {
    if (awayTimer) return;
    awayTimer = setTimeout(() => {
      log.warn("[Gateway] Phone stayed away too long mid-command — closing session.");
      try {
        g.ws.close();
      } catch {
        /* ignore */
      }
    }, INFLIGHT_AWAY_MS);
  };
  const disarmAwayClose = () => {
    if (awayTimer) {
      clearTimeout(awayTimer);
      awayTimer = null;
    }
  };

  const unsub = resilience
    ? resilience.onStateChange((s) => {
        if (s === "executor-away") armAwayClose();
        else disarmAwayClose(); // resumed ("connected") or already ending ("closed")
      })
    : () => {};
  if (resilience && resilience.getState() === "executor-away") armAwayClose();

  try {
    return await gate.execHaloCmd(command as any);
  } catch (e: any) {
    const msg = String(e?.message || e);
    const transient =
      msg.includes("no executor connected") ||
      msg.includes("Failed to send request");
    if (transient && resilience && resilience.getState() === "connected") {
      log.debug("[Gateway] Link blipped — retrying command");
      return await gate.execHaloCmd(command as any);
    }
    throw e;
  } finally {
    disarmAwayClose();
    unsub();
  }
}

/**
 * Clean up gateway connection
 */
export function cleanupGateway() {
  globalGateway = null;
  resilience = null;
}

/**
 * Read the wallet key from a Burner card via the HaLo Gateway (phone as NFC reader).
 */
export async function getBurnerAddressViaGateway(): Promise<BurnerKeyInfo> {
  if (!globalGateway) {
    throw new Error("Gateway not initialized. Please start pairing first.");
  }
  const gate = globalGateway;
  await gate.waitConnected();
  const key = await scanCardKeys((cmd) => execHaloCmdResilient(gate, cmd), {
    allowPerSlotFallback: true,
  });
  log.debug(`[Gateway] Using key slot ${key.keySlot}`);
  return { address: key.address, publicKey: key.publicKey, keySlot: key.keySlot };
}

/**
 * Start gateway pairing and return QR code info.
 * The exec URL lets a phone join this signing session — never log it.
 */
export async function startGatewayPairing(): Promise<GatewayPairInfo> {
  globalGateway = new HaloGateway("wss://s1.halo-gateway.arx.org", {
    createWebSocket: (url) => new WebSocket(url),
  });

  // Keep the session alive across brief phone drops (no constant re-scanning)
  resilience = installSessionResilience(globalGateway);

  const pairInfo = await globalGateway.startPairing();
  const qrCodeDataURL = await QRCode.toDataURL(pairInfo.execURL, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  return { execURL: pairInfo.execURL, qrCodeDataURL };
}

/**
 * Run one HaLo command on the card through the paired phone.
 */
export async function runGatewayCommand(command: Record<string, unknown>): Promise<any> {
  return execHaloCmdResilient(getGlobalGateway(), command);
}
