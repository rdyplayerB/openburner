'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function GettingStarted() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/images/openburnerlogo.svg" 
                alt="OpenBurner logo" 
                width={28} 
                height={28} 
                className="w-6 h-6 sm:w-7 sm:h-7"
              />
              <span className="text-lg sm:text-xl font-bold text-black tracking-tight mt-0.5">OpenBurner</span>
            </Link>
            <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
              <a
                href="https://arx-burner.myshopify.com/OPENBURNER"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">Get a Burner</span>
                <span className="sm:hidden">Burner</span>
              </a>
              <a
                href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm"
              >
                Docs
              </a>
              <a
                href="https://github.com/rdyplayerB/openburner"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
          Getting Started
        </h1>

        {/* Prerequisites */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Prerequisites</h2>
          <div className="space-y-3">
            {/* Burner Card */}
            <a 
              href="https://arx-burner.myshopify.com/OPENBURNER" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all group">
                <Image 
                  src="/images/burnerset.jpg" 
                  alt="Burner Card Set" 
                  width={96} 
                  height={96} 
                  className="rounded-lg object-cover w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
                />
                <div>
                  <p className="text-sm sm:text-base text-gray-900 font-medium group-hover:text-gray-700">Burner Ethereum</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Order here - 10% off →</p>
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
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all group">
                <Image 
                  src="/images/ACR1252U.png" 
                  alt="ACR1252U NFC Reader" 
                  width={96} 
                  height={96} 
                  className="rounded-lg object-contain w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
                />
                <div>
                  <p className="text-sm sm:text-base text-gray-900 font-medium group-hover:text-gray-700">USB NFC reader (ACR1252U or compatible)</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Get on Amazon →</p>
                </div>
              </div>
            </a>
            
            {/* HaLo Tools */}
            <a 
              href="https://github.com/arx-research/libhalo/releases" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all group">
                <Image 
                  src="/images/burneros.png" 
                  alt="HaLo Tools" 
                  width={96} 
                  height={96} 
                  className="rounded-lg object-cover w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
                />
                <div>
                  <p className="text-sm sm:text-base text-gray-900 font-medium group-hover:text-gray-700">HaLo Tools (Bridge)</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Download from GitHub →</p>
                </div>
              </div>
            </a>
            
            {/* Node.js */}
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg">
              <Image 
                src="/images/nodejs.png" 
                alt="Node.js" 
                width={96} 
                height={96} 
                className="rounded-lg w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain"
              />
              <div>
                <p className="text-sm sm:text-base text-gray-900 font-medium">Node.js 18+</p>
              </div>
            </div>
          </div>
        </section>

        {/* Install */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Installation</h2>
          
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">1. Clone and install</h3>
              <div className="bg-gray-900 rounded-lg p-3 sm:p-4 overflow-x-auto mb-2">
                <code className="text-green-400 font-mono text-xs sm:text-sm">
                  git clone https://github.com/rdyplayerB/openburner.git
                  <br />
                  cd openburner
                  <br />
                  npm install
                </code>
              </div>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">2. Configure environment</h3>
              <div className="bg-gray-900 rounded-lg p-3 sm:p-4 overflow-x-auto mb-2">
                <code className="text-green-400 font-mono text-xs sm:text-sm">
                  cp env.example .env.local
                </code>
              </div>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">3. Set up HaLo Bridge</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-3">
                Download the bridge from{' '}
                <a
                  href="https://github.com/arx-research/libhalo/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-900"
                >
                  HaLo Tools releases
                </a>
                . Run it and grant consent:
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 overflow-x-auto">
                <code className="text-gray-900 font-mono text-xs sm:text-sm break-all">
                  http://127.0.0.1:32868/consent?website=http://localhost:3000
                </code>
              </div>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 sm:mb-3">4. Run the app</h3>
              <div className="bg-gray-900 rounded-lg p-3 sm:p-4 overflow-x-auto mb-2">
                <code className="text-green-400 font-mono text-xs sm:text-sm">
                  npm run dev
                </code>
              </div>
              <p className="text-xs sm:text-sm text-gray-600">
                Open <code className="bg-gray-100 px-2 py-1 rounded text-xs">http://localhost:3000</code>
              </p>
            </div>
          </div>
        </section>

        {/* Next steps */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Next steps</h2>
          <ul className="space-y-2 text-sm sm:text-base text-gray-600">
            <li>• Tap your Burner Ethereum Card on the NFC reader</li>
            <li>• Configure networks (Ethereum, Base, etc.)</li>
            <li>• View balances and send transactions</li>
          </ul>
        </section>

        {/* Coming Soon */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Coming Soon</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <p className="text-gray-700 text-xs sm:text-sm">
              <strong>Token Swaps:</strong> Swap functionality is currently visible in the UI but disabled. Integration with 0x Swap is planned for a future update.
            </p>
          </div>
        </section>

        {/* Help */}
        <section className="border-t border-gray-200 pt-8 sm:pt-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Need help?</h2>
          <div className="space-y-2 text-sm sm:text-base">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <p className="text-xs sm:text-sm text-gray-600">
            Built by{' '}
            <a href="https://github.com/rdyplayerB" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 underline">
              @rdyplayerB
            </a>
            {' '}(
            <a href="https://x.com/rdyplayerB" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 underline">
              𝕏
            </a>
            {' / '}
            <a href="https://farcaster.xyz/rdyplayerb" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 underline">
              Farcaster
            </a>
            ) • MIT License
          </p>
        </div>
      </footer>
    </main>
  );
}
