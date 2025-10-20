"use client";

import { useState, useEffect } from "react";
import { Smartphone, Download, X, Share } from "lucide-react";

interface UniversalInstallMessageProps {
  onDismiss: () => void;
  onInstall?: () => void;
}

export function UniversalInstallMessage({ onDismiss, onInstall }: UniversalInstallMessageProps) {
  const [browserInfo, setBrowserInfo] = useState<{
    name: string;
    isIOS: boolean;
    isAndroid: boolean;
    isChrome: boolean;
    isSafari: boolean;
    isFirefox: boolean;
    isEdge: boolean;
    isSamsung: boolean;
  }>({
    name: 'Browser',
    isIOS: false,
    isAndroid: false,
    isChrome: false,
    isSafari: false,
    isFirefox: false,
    isEdge: false,
    isSamsung: false,
  });

  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isEdge = /Edge/.test(userAgent);
    const isSamsung = /SamsungBrowser/.test(userAgent);

    let browserName = 'Browser';
    if (isChrome) browserName = 'Chrome';
    else if (isSafari) browserName = 'Safari';
    else if (isFirefox) browserName = 'Firefox';
    else if (isEdge) browserName = 'Edge';
    else if (isSamsung) browserName = 'Samsung Internet';

    setBrowserInfo({
      name: browserName,
      isIOS,
      isAndroid,
      isChrome,
      isSafari,
      isFirefox,
      isEdge,
      isSamsung,
    });
  }, []);

  const getInstallInstructions = () => {
    const { isIOS, isAndroid, isChrome, isSafari, isFirefox, isEdge, isSamsung } = browserInfo;

    if (isIOS) {
      if (isSafari) {
        return {
          title: "Add to Home Screen",
          steps: [
            "Tap the Share button (square with arrow up) at the bottom",
            "Scroll down and tap 'Add to Home Screen'",
            "Tap 'Add' to confirm"
          ],
          icon: <Share className="w-6 h-6" />
        };
      } else {
        return {
          title: "Add to Home Screen",
          steps: [
            "Tap the Share button (square with arrow up) at the bottom",
            "Look for 'Add to Home Screen' or 'Install App'",
            "Follow the prompts to add to your home screen"
          ],
          icon: <Share className="w-6 h-6" />
        };
      }
    } else if (isAndroid) {
      if (isChrome) {
        return {
          title: "Install App",
          steps: [
            "Tap the menu button (three dots) in the address bar",
            "Look for 'Install app' or 'Add to Home screen'",
            "Tap it and follow the prompts"
          ],
          icon: <Download className="w-6 h-6" />
        };
      } else if (isSamsung) {
        return {
          title: "Add to Home Screen",
          steps: [
            "Tap the menu button (three dots)",
            "Select 'Add page to'",
            "Choose 'Home screen' and tap 'Add'"
          ],
          icon: <Download className="w-6 h-6" />
        };
      } else if (isEdge) {
        return {
          title: "Install App",
          steps: [
            "Tap the menu button (three dots)",
            "Select 'Apps'",
            "Choose 'Install this site as an app' and tap 'Install'"
          ],
          icon: <Download className="w-6 h-6" />
        };
      } else if (isFirefox) {
        return {
          title: "Install App",
          steps: [
            "Tap the menu button (three dots)",
            "Select 'Install'",
            "Tap 'Add' to confirm"
          ],
          icon: <Download className="w-6 h-6" />
        };
      } else {
        return {
          title: "Add to Home Screen",
          steps: [
            "Tap the menu button (three dots)",
            "Look for 'Add to Home screen' or 'Install app'",
            "Follow the prompts to install"
          ],
          icon: <Download className="w-6 h-6" />
        };
      }
    } else {
      return {
        title: "Add to Home Screen",
        steps: [
          "Tap the Share button (square with arrow up)",
          "Look for 'Add to Home Screen' or 'Install app'",
          "Follow the prompts to add to your home screen"
        ],
        icon: <Share className="w-6 h-6" />
      };
    }
  };

  const instructions = getInstallInstructions();

  const handleInstall = () => {
    if (onInstall) {
      onInstall();
    }
    setShowInstructions(true);
  };

  const handleDismiss = () => {
    // Store dismissal in session storage to prevent showing again
    sessionStorage.setItem('pwa-install-dismissed', 'true');
    onDismiss();
  };

  if (showInstructions) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-card-lg">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#FF6B35] rounded-full flex items-center justify-center">
                {instructions.icon}
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {instructions.title}
            </h3>
            
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
              Install OpenBurner
            </p>

            {/* Instructions */}
            <div className="text-left mb-6">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                How to install:
              </h4>
              <ol className="space-y-3">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-[#FF6B35] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowInstructions(false)}
                className="flex-1 bg-[#FF6B35] hover:bg-[#E55A2B] text-white py-3 px-4 rounded-xl font-semibold transition-colors"
              >
                Got it!
              </button>
              
              <button
                onClick={handleDismiss}
                className="px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
    <div className="bg-gradient-to-r from-[#FF6B35] to-[#E55A2B] rounded-2xl p-4 mb-6 text-white shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Smartphone className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1">
            Install OpenBurner
          </h3>
          <p className="text-white/90 text-sm mb-3 leading-relaxed">
            Install OpenBurner
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Show Instructions
            </button>
            
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors p-2"
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
