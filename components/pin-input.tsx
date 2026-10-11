"use client";

import { useState, useRef, useEffect } from "react";
import { Lock } from "lucide-react";
import { Modal } from "./common/modal";
import { SigningProgress, type ProgressStep } from "./signing/signing-progress";
import { setCardPhase } from "@/store/signing-store";

interface PinInputProps {
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  isVisible: boolean;
  error?: string | null;
  isLoading?: boolean;
  /** Fallback progress text when no `progress` steps are given. */
  loadingMessage?: string;
  /** While loading: the flow's steps and the current one (shows the card-tap screen). */
  progress?: { steps: ProgressStep[]; current: string };
  /** Heading above the PIN boxes, e.g. "Confirm with your PIN". */
  title?: string;
}

export function PinInput({
  onSubmit,
  onCancel,
  isVisible,
  error,
  isLoading = false,
  loadingMessage = "Processing...",
  progress,
  title = "Enter your PIN",
}: PinInputProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isVisible) {
      // Focus first input when modal opens
      inputRefs.current[0]?.focus();
      // Reset digits
      setDigits(["", "", "", "", "", ""]);
      setCardPhase("idle");
    }
  }, [isVisible]);

  // After a failed attempt the boxes come back: clear them for the retry.
  useEffect(() => {
    if (error && !isLoading) {
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
    }
  }, [error, isLoading]);

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
    if (isLoading) return; // double-submit guard
    const pin = digits.join("");
    if (pin.length === 6) {
      onSubmit(pin);
    }
  };

  const isComplete = digits.every(d => d !== "");

  if (!isVisible) return null;

  const steps: ProgressStep[] = progress?.steps ?? [{ key: "work", label: loadingMessage.replace(/[.…]+$/, ""), card: /sign|burner/i.test(loadingMessage) }];
  const current = progress?.current ?? "work";

  return (
    <Modal
      onClose={() => {
        if (!isLoading) onCancel();
      }}
      labelledBy="pin-title"
      closeOnBackdrop={false}
      closeOnEscape={!isLoading}
    >
      {isLoading ? (
        <>
          <h3 id="pin-title" className="sr-only">Signing</h3>
          <SigningProgress steps={steps} current={current} />
        </>
      ) : (
        <div className="px-5 pt-6 pb-5">
          <div className="text-center mb-5">
            <span className="mx-auto mb-3 w-10 h-10 rounded-full bg-[var(--sw-fill-strong)] text-[var(--sw-ink)] flex items-center justify-center">
              <Lock className="w-4 h-4" aria-hidden="true" />
            </span>
            <h3 id="pin-title" className="text-xl font-bold text-[var(--sw-ink)] tracking-tight">
              {title}
            </h3>
            <p className="text-sm text-[var(--sw-ink-soft)] mt-1">Then tap your Burner to sign.</p>
          </div>

          {error && (
            <div role="alert" className="sw-callout sw-callout-danger mb-4 text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center gap-2 mb-6">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                aria-label={`PIN digit ${index + 1}`}
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`w-11 h-14 text-center text-2xl font-bold sw-mono bg-[var(--sw-fill)] text-[var(--sw-ink)] rounded-xl border-2 focus:outline-none transition-colors ${
                  digit ? "border-[var(--sw-ink)]" : "border-transparent"
                } focus:border-[var(--sw-accent)]`}
              />
            ))}
          </div>

          <button onClick={handleSubmit} disabled={!isComplete} className="sw-btn-primary w-full py-3.5 text-sm">
            Continue
          </button>
          <button onClick={onCancel} className="w-full py-3 mt-1 text-sm font-semibold text-[var(--sw-ink-soft)] hover:text-[var(--sw-ink)]">
            Cancel
          </button>

          <p className="text-xs text-center text-[var(--sw-muted)] mt-2">Sent directly to your Burner, never stored.</p>
        </div>
      )}
    </Modal>
  );
}
