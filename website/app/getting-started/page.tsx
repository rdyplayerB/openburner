'use client';

import { ArrowLeft, Terminal, Cpu, Wifi, Github, Flame } from 'lucide-react';
import Link from 'next/link';

export default function GettingStarted() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                <Flame className="w-5 h-5 text-orange-400" strokeWidth={2.5} />
              </div>
              <span className="font-serif text-xl text-gray-900">OpenBurner</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft size={16} />
                <span>Back</span>
              </Link>
              <a
                href="https://github.com/rdyplayerB/openburner"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Github size={20} />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl md:text-6xl font-serif mb-6 text-gray-900">
          Getting Started
        </h1>
        <p className="text-xl text-gray-600 mb-16">
          Install and run OpenBurner in a few steps.
        </p>

        {/* Prerequisites */}
        <section className="mb-20">
          <h2 className="text-3xl font-serif mb-8 text-gray-900">Prerequisites</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <Cpu className="w-8 h-8 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Burner Card</h3>
              <p className="text-gray-600 mb-3">Specially programmed card with hardware-secured chip</p>
              <a
                href="https://burner.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 underline hover:text-gray-700"
              >
                Order from Burner.pro →
              </a>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <Wifi className="w-8 h-8 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">USB NFC Reader</h3>
              <p className="text-gray-600 mb-3">ACR122U or any PC/SC compatible NFC reader</p>
              <p className="text-sm text-gray-500">Available on Amazon</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <Terminal className="w-8 h-8 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Node.js 18+</h3>
              <p className="text-gray-600 mb-3">JavaScript runtime</p>
              <a
                href="https://nodejs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 underline hover:text-gray-700"
              >
                Download →
              </a>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <Terminal className="w-8 h-8 text-gray-700 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">HaLo Bridge</h3>
              <p className="text-gray-600 mb-3">Local WebSocket server</p>
              <p className="text-sm text-gray-500">Setup instructions below</p>
            </div>
          </div>
        </section>

        {/* Installation Steps */}
        <section className="mb-20">
          <h2 className="text-3xl font-serif mb-8 text-gray-900">Installation</h2>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="border-l-2 border-gray-900 pl-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-serif text-2xl text-gray-900">1</span>
                <h3 className="text-xl font-semibold text-gray-900">Clone the repository</h3>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <code className="text-green-400 font-mono text-sm">
                  git clone https://github.com/rdyplayerB/openburner.git
                  <br />
                  cd openburner
                </code>
              </div>
            </div>

            {/* Step 2 */}
            <div className="border-l-2 border-gray-900 pl-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-serif text-2xl text-gray-900">2</span>
                <h3 className="text-xl font-semibold text-gray-900">Install dependencies</h3>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <code className="text-green-400 font-mono text-sm">npm install</code>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border-l-2 border-gray-900 pl-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-serif text-2xl text-gray-900">3</span>
                <h3 className="text-xl font-semibold text-gray-900">Configure environment</h3>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <code className="text-green-400 font-mono text-sm">cp env.example .env.local</code>
              </div>
              <p className="text-sm text-gray-600">
                Optional: Add your CoinGecko API key for price data
              </p>
            </div>

            {/* Step 4 */}
            <div className="border-l-2 border-gray-900 pl-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-serif text-2xl text-gray-900">4</span>
                <h3 className="text-xl font-semibold text-gray-900">Set up HaLo Bridge</h3>
              </div>
              <p className="text-gray-600 mb-4">
                The HaLo Bridge enables communication between your browser and the NFC reader.
              </p>
              <a
                href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md#halo-bridge-setup"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 underline hover:text-gray-700 mb-4 inline-block"
              >
                View setup guide →
              </a>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  The bridge runs on <code className="bg-gray-200 px-2 py-1 rounded text-xs">ws://127.0.0.1:32868/ws</code>
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="border-l-2 border-gray-900 pl-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-serif text-2xl text-gray-900">5</span>
                <h3 className="text-xl font-semibold text-gray-900">Start the application</h3>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <code className="text-green-400 font-mono text-sm">npm run dev</code>
              </div>
              <p className="text-gray-600 mb-4">Open your browser:</p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <code className="text-gray-900 font-mono">http://localhost:3000</code>
              </div>
            </div>
          </div>
        </section>

        {/* Next Steps */}
        <section className="mb-20">
          <h2 className="text-3xl font-serif mb-8 text-gray-900">Next steps</h2>
          
          <div className="bg-gray-50 rounded-lg p-8 border border-gray-200">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-1">•</span>
                <span className="text-gray-600">Tap your Burner card on the NFC reader to connect</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-1">•</span>
                <span className="text-gray-600">Configure blockchain networks (Ethereum, Base, Arbitrum, etc.)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-1">•</span>
                <span className="text-gray-600">View your token balances with real-time prices</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-400 mt-1">•</span>
                <span className="text-gray-600">Send transactions with hardware-secured signing</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Help */}
        <section>
          <h2 className="text-3xl font-serif mb-8 text-gray-900">Need help?</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
              <p className="text-gray-600">Complete guide with architecture, API reference, and troubleshooting</p>
            </a>

            <a
              href="https://github.com/rdyplayerB/openburner/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">GitHub Issues</h3>
              <p className="text-gray-600">Report bugs, request features, or ask questions</p>
            </a>
          </div>
        </section>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 mt-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                <Flame className="w-5 h-5 text-orange-400" strokeWidth={2.5} />
              </div>
              <div className="text-gray-600">
                <p className="font-serif text-xl text-gray-900">OpenBurner</p>
                <p className="text-sm">MIT License</p>
              </div>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="https://github.com/rdyplayerB/openburner" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors">
                GitHub
              </a>
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Home
              </Link>
              <a href="https://burner.pro" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors">
                Get a Burner
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
