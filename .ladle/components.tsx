import "../app/globals.css";
import "./fonts.css";
import { useLayoutEffect, useState } from "react";
import type { GlobalProvider } from "@ladle/react";
import { PortalRootContext } from "@/components/common/portal-root";
import { useThemeStore } from "@/store/theme-store";
import { installBridgeStub } from "./bridge-stub";

installBridgeStub();

/**
 * Wraps every story: app styles and fonts, Ladle's light/dark switch mapped to
 * the app's `.dark` class, and dialogs portalled into the story's own frame.
 */
export const Provider: GlobalProvider = ({ children, globalState }) => {
  const [frameBody, setFrameBody] = useState<HTMLElement | null>(null);
  const dark = globalState.theme === "dark";

  useLayoutEffect(() => {
    const doc = frameBody?.ownerDocument;
    if (!doc) return;
    doc.documentElement.classList.toggle("dark", dark);
    doc.body.classList.add("ob-story");
    useThemeStore.setState({ isDarkMode: dark });
  }, [dark, frameBody]);

  return (
    <div
      className="sw-screen min-h-screen ob-story"
      ref={(el) => {
        const body = el?.ownerDocument.body ?? null;
        if (body !== frameBody) setFrameBody(body);
      }}
    >
      {frameBody && <PortalRootContext.Provider value={frameBody}>{children}</PortalRootContext.Provider>}
    </div>
  );
};
