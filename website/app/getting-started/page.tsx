'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GettingStarted() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="font-medium text-gray-900">
              OpenBurner
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
              <ArrowLeft size={16} />
              Back
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Getting Started
        </h1>

        {/* Prerequisites */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Prerequisites</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• Burner Card (<a href="https://arx-burner.myshopify.com/OPENBURNER" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">order here - 10% off</a>)</li>
            <li>• USB NFC reader (ACR122U or compatible)</li>
            <li>• Node.js 18+</li>
          </ul>
        </section>

        {/* Install */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Installation</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">1. Clone and install</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-2">
                <code className="text-green-400 font-mono text-sm">
                  git clone https://github.com/rdyplayerB/openburner.git
                  <br />
                  cd openburner
                  <br />
                  npm install
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">2. Configure environment</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-2">
                <code className="text-green-400 font-mono text-sm">
                  cp env.example .env.local
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">3. Set up Burner Bridge</h3>
              <p className="text-gray-600 mb-3">
                Download the bridge from{' '}
                <a
                  href="https://github.com/arx-research/libburner/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-900"
                >
                  Burner Gateway releases
                </a>
                . Run it and grant consent:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <code className="text-gray-900 font-mono text-sm">
                  http://127.0.0.1:32868/consent?website=http://localhost:3000
                </code>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">4. Run the app</h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto mb-2">
                <code className="text-green-400 font-mono text-sm">
                  npm run dev
                </code>
              </div>
              <p className="text-sm text-gray-600">
                Open <code className="bg-gray-100 px-2 py-1 rounded text-xs">http://localhost:3000</code>
              </p>
            </div>
          </div>
        </section>

        {/* Next steps */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Next steps</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• Tap your Burner Ethereum Card on the NFC reader</li>
            <li>• Configure networks (Ethereum, Base, etc.)</li>
            <li>• View balances and send transactions</li>
          </ul>
        </section>

        {/* Coming Soon */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Coming Soon</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-gray-700 text-sm">
              <strong>Token Swaps:</strong> Swap functionality is currently visible in the UI but disabled. Integration with swap protocols is planned for a future update.
            </p>
          </div>
        </section>

        {/* Help */}
        <section className="border-t border-gray-200 pt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need help?</h2>
          <div className="space-y-2">
            <p>
              <a href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md" target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline">
                Read the full docs →
              </a>
            </p>
            <p>
              <a href="https://github.com/rdyplayerB/openburner/issues" target="_blank" rel="noopener noreferrer" className="text-gray-900 hover:underline">
                Open an issue →
              </a>
            </p>
          </div>
        </section>
      </article>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-sm text-gray-600">
            By{' '}
            <a href="https://github.com/rdyplayerB" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">
              @rdyplayerB
            </a>
            {' '}• MIT License
          </p>
        </div>
      </footer>
    </main>
  );
}
