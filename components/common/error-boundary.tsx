"use client";

import { Component, type ReactNode } from "react";
import { log, errMsg } from "@/lib/log";

/**
 * Keeps one broken widget (e.g. a malformed dApp request) from blanking the
 * whole app. Shows `fallback` instead; `resetKey` changing tries again.
 */
export class ErrorBoundary extends Component<
  { fallback: ReactNode; resetKey?: unknown; children: ReactNode },
  { failed: boolean; key: unknown }
> {
  state = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: { resetKey?: unknown }, state: { failed: boolean; key: unknown }) {
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }

  componentDidCatch(error: unknown) {
    log.error("[ui] component crashed:", errMsg(error));
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
