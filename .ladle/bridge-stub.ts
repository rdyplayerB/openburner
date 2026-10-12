import { knobs } from "./scenario";

/**
 * The welcome screen polls the local HaLo Bridge over a WebSocket. In stories
 * that socket is answered here (per the `bridge` knob); every other socket,
 * such as Vite's hot reload, is left alone.
 */
export function installBridgeStub() {
  if (typeof window === "undefined" || (window as any).__obBridgeStub) return;
  (window as any).__obBridgeStub = true;
  const Real = window.WebSocket;

  class BridgeSocket extends EventTarget {
    readyState = 0;
    onopen: ((e: Event) => void) | null = null;
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: Event) => void) | null = null;
    onclose: ((e: Event) => void) | null = null;
    constructor() {
      super();
      setTimeout(() => {
        if (knobs.bridge !== "ready") {
          this.readyState = 3;
          this.onerror?.(new Event("error"));
          return;
        }
        this.readyState = 1;
        this.onopen?.(new Event("open"));
        setTimeout(() => this.onmessage?.(new MessageEvent("message", { data: JSON.stringify({ event: "handle_added" }) })), 300);
      }, 250);
    }
    send() {}
    close() {
      this.readyState = 3;
    }
  }

  const Patched = function (this: unknown, url: string | URL, protocols?: string | string[]) {
    if (String(url).includes("127.0.0.1:32868")) return new BridgeSocket();
    return new Real(url, protocols);
  } as unknown as typeof WebSocket;
  Object.assign(Patched, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  Patched.prototype = Real.prototype;
  window.WebSocket = Patched;
}
