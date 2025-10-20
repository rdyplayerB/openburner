"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, isVisible, onClose, duration = 2000 }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);

  console.log('Toast render:', { isVisible, isExiting, isManuallyClosed, message });

  useEffect(() => {
    if (isVisible && !isManuallyClosed) {
      setIsExiting(false);
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onClose, 300); // Wait for exit animation
      }, duration);

      return () => clearTimeout(timer);
    } else if (!isVisible) {
      // Reset states when toast becomes invisible
      setIsExiting(false);
      setIsManuallyClosed(false);
    }
  }, [isVisible, duration, onClose, isManuallyClosed]);

  if (!isVisible && !isExiting) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] pointer-events-none">
      <div
        className={`pointer-events-auto bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg dark:shadow-2xl dark:border dark:border-slate-700 flex items-center gap-3 min-w-[200px] ${
          isExiting ? "toast-slide-out" : "toast-slide-in"
        }`}
      >
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" strokeWidth={2.5} />
        <span className="text-sm font-medium flex-1">{message}</span>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Toast close button clicked');
            setIsManuallyClosed(true);
            setIsExiting(true);
            setTimeout(onClose, 300);
          }}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50 flex-shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

