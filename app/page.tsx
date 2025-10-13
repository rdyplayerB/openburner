"use client";

import Link from "next/link";
import { Github, BookOpen, Cpu, Lock, Layers, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl">
          <h1 className="text-6xl md:text-7xl font-serif mb-6 text-gray-900 leading-tight">
            OpenBurner
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 leading-relaxed mb-8">
            A Web3 wallet built on hardware-secured NFC chips. Open source, multi-chain, 
            built for the Burner ecosystem.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link 
              href="/wallet" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Try it out
            </Link>
            <Link 
              href="https://github.com/yourusername/OpenBurner" 
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Github size={20} />
              View on GitHub
            </Link>
            <Link 
              href="/docs" 
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
            >
              <BookOpen size={20} />
              Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif mb-6 text-gray-900">
                Hardware meets software
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                OpenBurner connects HaLo NFC chips to the web. Private keys stay in the 
                secure element. Transactions are signed on-chip. The wallet interface runs 
                in your browser.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                It works across Ethereum, Base, Arbitrum, Optimism, Polygon, and any 
                EVM-compatible chain.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Hardware-secured keys</h3>
                    <p className="text-gray-600 text-sm">Private keys never leave the secure element chip</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Layers size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Multi-chain support</h3>
                    <p className="text-gray-600 text-sm">Works with any EVM-compatible blockchain</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap size={24} className="text-gray-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Efficient design</h3>
                    <p className="text-gray-600 text-sm">Multicall3 batching and intelligent caching</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-serif mb-12 text-gray-900 max-w-2xl">
            Three layers
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="border-t-2 border-gray-900 pt-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Web Application</h3>
              <p className="text-gray-600 leading-relaxed">
                Built with Next.js and TypeScript. Handles the wallet UI, transaction 
                building, and token management.
              </p>
            </div>
            <div className="border-t-2 border-gray-900 pt-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">HaLo Bridge</h3>
              <p className="text-gray-600 leading-relaxed">
                Local WebSocket server that connects the browser to your NFC reader 
                over PC/SC protocol.
              </p>
            </div>
            <div className="border-t-2 border-gray-900 pt-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-900">NFC Chip</h3>
              <p className="text-gray-600 leading-relaxed">
                HaLo secure element chip that stores keys and signs transactions. 
                EAL6+ certified hardware.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built with */}
      <section className="bg-gray-900 py-24 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif mb-6">
                Built on modern tools
              </h2>
              <p className="text-gray-300 leading-relaxed text-lg">
                Next.js 14, TypeScript, ethers.js v6, Tailwind CSS, and Zustand. 
                The entire stack is documented and ready to extend.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 mb-1">Framework</p>
                <p className="font-medium">Next.js 14</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 mb-1">Language</p>
                <p className="font-medium">TypeScript 5</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 mb-1">Blockchain</p>
                <p className="font-medium">ethers.js v6</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 mb-1">Hardware</p>
                <p className="font-medium">libhalo 1.15</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contributing */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Cpu size={48} className="mx-auto mb-6 text-gray-900" />
          <h2 className="text-4xl md:text-5xl font-serif mb-6 text-gray-900">
            Open source
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
            OpenBurner extends the Burner ecosystem. Contributions, issues, and 
            feedback are welcome.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link 
              href="https://github.com/yourusername/OpenBurner/issues" 
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
            >
              Report an issue
            </Link>
            <Link 
              href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md" 
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 transition-colors"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-serif mb-12 text-gray-900">
            What you need
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Hardware</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>HaLo NFC chip (order from arx.org)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>USB NFC reader (ACR122U or compatible)</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Software</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Node.js 18 or later</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>HaLo Bridge (included in setup)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-gray-600">
              <p className="font-serif text-xl text-gray-900 mb-2">OpenBurner</p>
              <p className="text-sm">MIT License</p>
            </div>
            <div className="flex gap-8 text-sm">
              <Link href="https://github.com/yourusername/OpenBurner" className="text-gray-600 hover:text-gray-900 transition-colors">
                GitHub
              </Link>
              <Link href="/docs" className="text-gray-600 hover:text-gray-900 transition-colors">
                Documentation
              </Link>
              <Link href="https://arx.org" className="text-gray-600 hover:text-gray-900 transition-colors">
                HaLo Chips
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

