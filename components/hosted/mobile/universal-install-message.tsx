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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-100 rounded-lg p-4 max-w-sm w-full shadow-lg">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                {instructions.icon}
              </div>
            </div>
            
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {instructions.title}
            </h3>
            
            <p className="text-gray-600 mb-4 text-sm">
              Install OpenBurner for quick access from your home screen
            </p>

            {/* Instructions */}
            <div className="text-left mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                How to install:
              </h4>
              <ol className="space-y-2">
                {instructions.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-gray-400 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-600 leading-relaxed">
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
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded font-medium transition-colors"
              >
                Got it!
              </button>
              
              <button
                onClick={handleDismiss}
                className="px-3 py-2 border border-gray-400 text-gray-600 rounded hover:bg-gray-200 transition-colors"
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
    <div className="bg-white rounded-2xl p-4 mb-6 text-gray-800 shadow-lg border border-gray-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
          <Download className="w-6 h-6 text-gray-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg mb-1 text-gray-900">
            Install OpenBurner
          </h3>
          <p className="text-gray-600 text-sm mb-3 leading-relaxed">
            Add to home screen for quick access
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-xl font-medium transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Install
            </button>
            
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2"
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
