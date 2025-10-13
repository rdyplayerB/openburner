'use client';

import { ArrowLeft, Terminal, Cpu, Wifi, Download, CheckCircle2, ExternalLink, Github } from 'lucide-react';
import Link from 'next/link';

export default function GettingStarted() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">🔥</div>
              <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                OpenBurner
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
              <a
                href="https://github.com/rdyplayerB/openburner"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Getting Started
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Install and run OpenBurner locally in minutes
          </p>
        </div>

        {/* Prerequisites */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-3">
            <CheckCircle2 className="w-8 h-8 text-orange-500" />
            <span>Prerequisites</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <Cpu className="w-10 h-10 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                HaLo NFC Chip
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Hardware-secured chip for storing private keys
              </p>
              <a
                href="https://arx.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
              >
                <span>Order from Arx</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <Wifi className="w-10 h-10 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                USB NFC Reader
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                ACR122U or any PC/SC compatible NFC reader
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Available on Amazon or electronics retailers
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <Terminal className="w-10 h-10 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Node.js 18+
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                JavaScript runtime for running the application
              </p>
              <a
                href="https://nodejs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
              >
                <span>Download Node.js</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <Download className="w-10 h-10 text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                HaLo Bridge Software
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Local WebSocket bridge for NFC communication
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Installation instructions below
              </p>
            </div>
          </div>
        </section>

        {/* Installation Steps */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Installation Steps
          </h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    Clone the Repository
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Download the OpenBurner source code from GitHub:
                  </p>
                  <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                    <code className="text-green-400 font-mono text-sm">
                      git clone https://github.com/rdyplayerB/openburner.git
                      <br />
                      cd openburner
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    Install Dependencies
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Install the required npm packages:
                  </p>
                  <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
                    <code className="text-green-400 font-mono text-sm">
                      npm install
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    Configure Environment
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your environment configuration file:
                  </p>
                  <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto mb-4">
                    <code className="text-green-400 font-mono text-sm">
                      cp env.example .env.local
                    </code>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Optional: Add your CoinGecko API key for price data (free tier works without a key)
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    Set Up HaLo Bridge
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    The HaLo Bridge enables communication between your browser and the NFC reader. Follow the setup guide in the repository:
                  </p>
                  <a
                    href="https://github.com/rdyplayerB/openburner/blob/main/docs/setup/BRIDGE_SETUP.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 mb-4"
                  >
                    <span>View Bridge Setup Guide</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
                    <p className="text-sm text-orange-900 dark:text-orange-200">
                      <strong>Note:</strong> The bridge runs on <code className="bg-orange-100 dark:bg-orange-900/50 px-2 py-1 rounded">ws://127.0.0.1:32868/ws</code> by default.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-orange-500 to-red-600 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    Start the Application
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Run the development server:
                  </p>
                  <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto mb-4">
                    <code className="text-green-400 font-mono text-sm">
                      npm run dev
                    </code>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Open your browser and navigate to:
                  </p>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                    <code className="text-orange-600 dark:text-orange-400 font-mono">
                      http://localhost:3000
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Next Steps
          </h2>
          
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-xl p-8">
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Connect Your HaLo Chip
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Tap your HaLo chip on the NFC reader to connect your wallet
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Add Networks
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Configure the blockchain networks you want to use (Ethereum, Base, Arbitrum, etc.)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    View Token Balances
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    See your ETH and ERC-20 token balances with real-time prices
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Send Transactions
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Transfer tokens with hardware-secured transaction signing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Help & Resources */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Help & Resources
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://github.com/rdyplayerB/openburner/blob/main/docs/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Documentation
                </h3>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive guides, API reference, and technical documentation
              </p>
            </a>

            <a
              href="https://github.com/rdyplayerB/openburner/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-lg transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  GitHub Issues
                </h3>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Report bugs, request features, or ask questions
              </p>
            </a>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Need Help?
          </h2>
          <p className="text-xl mb-6 text-orange-50">
            Check out our documentation or open an issue on GitHub
          </p>
          <a
            href="https://github.com/rdyplayerB/openburner"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 bg-white text-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-orange-50 transition-all"
          >
            <Github className="w-5 h-5" />
            <span>Visit GitHub</span>
          </a>
        </div>
      </section>
    </div>
  );
}

