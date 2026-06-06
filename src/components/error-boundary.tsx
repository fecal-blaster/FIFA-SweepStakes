"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("ErrorBoundary caught", this.props.label, error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-live-500/30 bg-live-500/5 p-4 text-sm">
          <p className="text-live-400 font-medium">
            {this.props.label ?? "Component"} failed to render
          </p>
          <p className="text-white/60 mt-1 break-words">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
