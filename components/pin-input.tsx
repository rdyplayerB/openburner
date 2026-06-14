"use client";

import { useState, useRef, useEffect } from "react";

interface PinInputProps {
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  isVisible: boolean;
  error?: string | null;
  isLoading?: boolean;
  loadingMessage?: string;
}

export function PinInput({ onSubmit, onCancel, isVisible, error, isLoading = false, loadingMessage = "Processing..." }: PinInputProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isVisible) {
      // Focus first input when modal opens
      inputRefs.current[0]?.focus();
      // Reset digits
      setDigits(["", "", "", "", "", ""]);
    }
  }, [isVisible]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newDigits = [...digits];
    
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    
    setDigits(newDigits);
    
    // Focus the next empty input or last input
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = () => {
    const pin = digits.join("");
    if (pin.length === 6) {
      onSubmit(pin);
    }
  };

  const isComplete = digits.every(d => d !== "");

  if (!isVisible) return null;

  return (
    <div className="modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-[10001]">
      <div className="sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-[var(--sw-line)] text-center">
          <h3 className="text-lg font-bold text-[var(--sw-ink)]">Enter PIN</h3>
          <p className="text-sm text-[var(--sw-ink-soft)] mt-1">
            6-digit Burner PIN to authorize
          </p>
        </div>

        <div className="px-5 py-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-[var(--sw-line)]">
              <p className="text-sm text-[var(--sw-down)]">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="mb-4 p-3 rounded-lg border border-[var(--sw-line)]">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--sw-accent)]"></div>
                <p className="text-sm text-[var(--sw-ink-soft)]">{loadingMessage}</p>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2 mb-6">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={isLoading}
                className={`w-11 h-14 text-center text-2xl font-bold sw-mono bg-transparent text-[var(--sw-ink)] rounded-lg border focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  digit ? "border-[var(--sw-accent)]" : "border-[var(--sw-line)]"
                } focus:border-[var(--sw-accent)]`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="sw-btn-ghost py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isComplete || isLoading}
              className="sw-btn-primary py-3 text-sm"
            >
              Submit
            </button>
          </div>

          <p className="text-xs text-center text-[var(--sw-muted)] mt-4">
            Sent directly to your Burner, never stored
          </p>
        </div>
      </div>
    </div>
  );
}

