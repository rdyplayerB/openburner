"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BurnerKeyInfo } from "@/lib/burner-gateway";
import { log } from "@/lib/log";

/**
 * Drives desktop ↔ phone pairing through the HaLo Gateway with visible stages:
 *
 *   starting -> waiting-phone -> phone-connected (tap card) -> done
 *                         \-> error (shown to the user, with retry / new QR)
 *
 * The gateway module (and libhalo) is loaded only when pairing starts.
 */
export type PairingStage = "idle" | "starting" | "waiting-phone" | "phone-connected" | "done" | "error";

export interface PairingQr {
  qrCodeDataURL: string;
  execURL: string;
}

function friendlyGatewayError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/GATEWAY_SESSION_CLOSED|closed/i.test(msg)) {
    return "The gateway session closed. Generate a new QR code and scan it again.";
  }
  if (/timeout/i.test(msg)) return "Timed out waiting for the phone. Generate a new QR code and try again.";
  if (/websocket|network|failed to fetch/i.test(msg)) {
    return "Couldn't reach the HaLo Gateway. Check your internet connection and try again.";
  }
  return msg || "Couldn't read your Burner card. Keep it against the phone and try again.";
}

export function useGatewayPairing(onConnected: (info: BurnerKeyInfo) => void) {
  const [stage, setStage] = useState<PairingStage>("idle");
  const [qr, setQr] = useState<PairingQr | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attempt = useRef(0);
  const stageRef = useRef<PairingStage>("idle");
  stageRef.current = stage;
  const unsubRef = useRef<(() => void) | null>(null);
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  const teardown = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
  }, []);

  /** Ask the (already paired) phone to read the card. */
  const readCard = useCallback(async (myAttempt: number) => {
    const gw = await import("@/lib/burner-gateway");
    try {
      const info = await gw.getBurnerAddressViaGateway();
      if (myAttempt !== attempt.current) return;
      setStage("done");
      teardown();
      onConnectedRef.current(info);
    } catch (err) {
      if (myAttempt !== attempt.current) return;
      log.warn("[gateway] read failed:", err instanceof Error ? err.message : err);
      setError(friendlyGatewayError(err));
      setStage("error");
    }
  }, [teardown]);

  const start = useCallback(async () => {
    const myAttempt = ++attempt.current;
    teardown();
    setError(null);
    setQr(null);
    setStage("starting");
    try {
      const gw = await import("@/lib/burner-gateway");
      const pairInfo = await gw.startGatewayPairing();
      if (myAttempt !== attempt.current) return;
      setQr({ qrCodeDataURL: pairInfo.qrCodeDataURL, execURL: pairInfo.execURL });
      setStage("waiting-phone");

      unsubRef.current = gw.onGatewayStateChange((s) => {
        if (myAttempt !== attempt.current) return;
        const current = stageRef.current;
        if (current === "done" || current === "error") return;
        if (s === "connected") setStage("phone-connected");
        else if (s === "executor-away") setStage("waiting-phone");
        else if (s === "closed") {
          setError(friendlyGatewayError(new Error("GATEWAY_SESSION_CLOSED")));
          setStage("error");
        }
      });

      await readCard(myAttempt);
    } catch (err) {
      if (myAttempt !== attempt.current) return;
      log.warn("[gateway] pairing failed:", err instanceof Error ? err.message : err);
      setError(friendlyGatewayError(err));
      setStage("error");
    }
  }, [readCard, teardown]);

  /** Retry the card read on the same session (phone still connected), else re-pair. */
  const retry = useCallback(async () => {
    const gw = await import("@/lib/burner-gateway");
    if (qr && gw.getGatewayConnectionState() === "connected") {
      const myAttempt = ++attempt.current;
      setError(null);
      setStage("phone-connected");
      readCard(myAttempt);
    } else {
      start();
    }
  }, [qr, readCard, start]);

  const cancel = useCallback(() => {
    attempt.current++;
    teardown();
    setStage("idle");
    setQr(null);
    setError(null);
    import("@/lib/burner-gateway").then((gw) => gw.cleanupGateway()).catch(() => {});
  }, [teardown]);

  useEffect(() => () => teardown(), [teardown]);

  return { stage, qr, error, start, retry, regenerate: start, cancel };
}
