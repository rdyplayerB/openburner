// Direct WebSocket communication with HaLo Bridge
// This provides direct communication with the bridge for Burner card operations

const BRIDGE_WS_URL = "ws://127.0.0.1:32868/ws";

interface BridgeMessage {
  event: string;
  uid: string | null;
  data: any;
}

let ws: any = null;
let currentHandle: string | null = null;
let messageCallbacks: Map<string, (data: any) => void> = new Map();

export async function connectToBridge(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error("Bridge connection only works in browser"));
      return;
    }

    // Use browser WebSocket
    const WebSocket = (window as any).WebSocket;
    ws = new WebSocket(BRIDGE_WS_URL);

    ws.onopen = () => {
      console.log("Connected to HaLo Bridge");
    };

    ws.onmessage = (event: MessageEvent) => {
      const msg: BridgeMessage = JSON.parse(event.data);
      console.log("Bridge message:", msg);

      if (msg.event === "handle_added") {
        currentHandle = msg.data.handle;
        console.log("Burner card detected, handle:", currentHandle);
        resolve();
      } else if (msg.event === "exec_success" && msg.uid) {
        const callback = messageCallbacks.get(msg.uid);
        if (callback) {
          callback(msg.data.res);
          messageCallbacks.delete(msg.uid);
        }
      } else if (msg.event === "exec_exception" && msg.uid) {
        const callback = messageCallbacks.get(msg.uid);
        if (callback) {
          // Check if it's a password error that needs consent redirect
          const errorMsg = msg.data.exception?.message || "";
          if (errorMsg.includes("ERROR_CODE_WRONG_PWD") || errorMsg.includes("NEEDS_CONSENT")) {
            console.log("🔐 PIN required - opening consent page...");
            // Open consent page in a new window for PIN entry
            const consentUrl = `http://localhost:32868/consent?uid=${msg.uid}`;
            window.open(consentUrl, "Burner PIN", "width=400,height=600");
            // Don't delete callback - wait for consent completion
            return;
          }
          callback({ error: msg.data.exception.message });
          messageCallbacks.delete(msg.uid);
        }
      } else if (msg.event === "consent_success" && msg.uid) {
        console.log("✅ PIN consent granted, waiting for execution...");
        // The exec_success will follow
      }
    };

    ws.onerror = (error: Event) => {
      console.error("Bridge connection error:", error);
      reject(new Error("Failed to connect to HaLo Bridge"));
    };

    ws.onclose = () => {
      console.log("Bridge connection closed");
      currentHandle = null;
    };

    // Timeout if no chip detected within 10 seconds
    setTimeout(() => {
      if (!currentHandle) {
        reject(new Error("No Burner card detected. Please place Burner card on reader."));
      }
    }, 10000);
  });
}

export async function execBridgeCommand(command: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || !currentHandle) {
      reject(new Error("Not connected to bridge or no card present"));
      return;
    }

    const uid = Math.random().toString();
    const message = {
      uid,
      type: "exec_halo",
      handle: currentHandle,
      command,
    };

    messageCallbacks.set(uid, (data) => {
      if (data.error) {
        reject(new Error(data.error));
      } else {
        resolve(data);
      }
    });

    ws.send(JSON.stringify(message));

    // Timeout after 30 seconds
    setTimeout(() => {
      if (messageCallbacks.has(uid)) {
        messageCallbacks.delete(uid);
        reject(new Error("Command timeout"));
      }
    }, 30000);
  });
}

export function disconnectBridge() {
  if (ws) {
    ws.close();
    ws = null;
    currentHandle = null;
    messageCallbacks.clear();
  }
}

