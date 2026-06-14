"use client";

import { useState } from "react";
import { Smartphone, Download, X, Share } from "lucide-react";

interface UniversalInstallMessageProps {
  onDismiss: () => void;
  onInstall?: () => void;
}

export function UniversalInstallMessage({ onDismiss, onInstall }: UniversalInstallMessageProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const getUniversalInstructions = () => {
    return {
      title: "Add to Home Screen",
      steps: [
        "Look for the Share button (square with arrow up) or menu (three dots)",
        "Find 'Add to Home Screen' or 'Install App' option",
        "Follow the prompts to add OpenBurner to your home screen"
      ],
      icon: <Share className="w-6 h-6" />
    };
  };

  const instructions = getUniversalInstructions();

  const handleInstall = () => {
    if (onInstall) {
      onInstall();
    }
    setShowInstructions(true);
  };

  const handleDismiss = () => {
    onDismiss();
  };

  if (showInstructions) {
    return (
      <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3">
        <div className="sw-surface rounded-xl border border-[var(--sw-line)] overflow-hidden p-5 max-w-sm w-full">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 sw-mark rounded-lg flex items-center justify-center">
                {instructions.icon}
              </div>
            </div>

            <h3 className="text-lg font-bold text-[var(--sw-ink)] mb-2">
              {instructions.title}
            </h3>

            <p className="text-[var(--sw-ink-soft)] mb-4 text-sm leading-relaxed">
              Install OpenBurner for quick access from your home screen.
            </p>

            {/* Instructions */}
            <div className="text-left mb-5">
              <div className="sw-uplabel mb-3">How to install</div>
              <ol className="space-y-2">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 sw-mark rounded-md text-xs font-medium flex items-center justify-center sw-num">
                      {index + 1}
                    </span>
                    <span className="text-sm text-[var(--sw-ink-soft)] leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowInstructions(false)}
                className="sw-btn-primary flex-1 py-3 text-sm"
              >
                Got it
              </button>

              <button
                onClick={handleDismiss}
                className="sw-btn-ghost px-3 py-3 text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sw-surface rounded-xl p-4 mb-6 border border-[var(--sw-line)]">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 sw-mark rounded-lg flex items-center justify-center">
          <Download className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1 text-[var(--sw-ink)]">
            Install OpenBurner
          </h3>
          <p className="text-[var(--sw-ink-soft)] text-sm mb-3 leading-relaxed">
            Add to home screen for quick access.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="sw-btn-primary py-2.5 px-4 text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install
            </button>

            <button
              onClick={handleDismiss}
              className="text-[var(--sw-muted)] hover:text-[var(--sw-ink)] transition-colors p-2"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
