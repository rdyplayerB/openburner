'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function GettingStarted() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/images/openburnerlogo.svg" 
                alt="OpenBurner logo" 
                width={28} 
                height={28} 
                className="w-7 h-7"
              />
              <span className="text-xl font-bold text-black tracking-tight mt-0.5">OpenBurner</span>
            </Link>
            <div className="flex items-center gap-8">
              <a
                href="https://arx-burner.myshopify.com/OPENBURNER"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Get a Burner
              </a>
              <a
                href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Docs
              </a>
              <a
                href="https://github.com/rdyplayerB/openburner"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                GitHub
              </a>
            </div>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Prerequisites</h2>
          <div className="space-y-3">
            {/* Burner Card */}
            <a 
              href="https://arx-burner.myshopify.com/OPENBURNER" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all group">
                <Image 
                  src="/images/burnerset.jpg" 
                  alt="Burner Card Set" 
                  width={96} 
                  height={96} 
                  className="rounded-lg object-cover w-24 h-24"
                />
                <div>
                  <p className="text-gray-900 font-medium group-hover:text-gray-700">Burner Card</p>
                  <p className="text-sm text-gray-500 mt-1">Order here - 10% off →</p>
                </div>
              </div>
            </a>
            
            {/* NFC Reader */}
            <a 
              href="https://amzn.to/3ISNwd7" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all group">
                <Image 
                  src="/images/ACR1252U.png" 
                  alt="ACR1252U NFC Reader" 
                  width={96} 
                  height={96} 
                  className="rounded-lg object-contain w-24 h-24"
                />
                <div>
                  <p className="text-gray-900 font-medium group-hover:text-gray-700">USB NFC reader (ACR1252U or compatible)</p>
                  <p className="text-sm text-gray-500 mt-1">Get on Amazon →</p>
                </div>
              </div>
            </a>
            
            {/* Node.js */}
            <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
              <Image 
                src="/images/nodejs.png" 
                alt="Node.js" 
                width={96} 
                height={96} 
                className="rounded-lg w-24 h-24 object-contain"
              />
              <div>
                <p className="text-gray-900 font-medium">Node.js 18+</p>
              </div>
            </div>
          </div>
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
              <strong>Token Swaps:</strong> Swap functionality is currently visible in the UI but disabled. Integration with 0x Swap is planned for a future update.
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
            <a href="https://github.com/rdyplayerB" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 underline">
              @rdyplayerB
            </a>
            {' '}(
            <a href="https://x.com/rdyplayerB" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 underline">
              𝕏
            </a>
            ) • MIT License
          </p>
        </div>
      </footer>
    </main>
  );
}
