'use client';

import { Github, Lock, Layers, Zap, Cpu, Flame } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
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
              <Link href="/getting-started" className="text-gray-600 hover:text-gray-900 transition-colors">
                Getting Started
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

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
            An open source Web3 wallet for Burner cards
          </h1>
          <div className="flex gap-4 flex-wrap">
            <Link 
              href="/getting-started" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/rdyplayerB/openburner"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white border-2 border-gray-300 text-gray-900 px-8 py-4 rounded-lg font-semibold hover:border-gray-400 transition-all"
            >
              <Github size={20} />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif mb-6 text-gray-900">
                Extending Burner
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                OpenBurner extends Burner's utility by adding support for chains beyond what 
                BurnerOS currently offers. Supports everything BurnerOS does (Ethereum, Base, 
                Arbitrum, Optimism, Polygon), plus Blast, Scroll, Linea, zkSync Era, and any 
                custom EVM-compatible chain.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-lg">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Hardware-secured keys</h3>
                    <p className="text-gray-600 text-sm">Private keys never leave the secure element chip</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Layers size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Multi-chain support</h3>
                    <p className="text-gray-600 text-sm">Works with any EVM-compatible blockchain</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Open source</h3>
                    <p className="text-gray-600 text-sm">Code is public and auditable</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-serif mb-6 text-gray-900">
              How it works
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              Download and run it on your machine. Your Burner card stores the keys.
              The wallet connects to RPC endpoints you configure.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Everything is open source and MIT licensed.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 py-24 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Tech stack
              </h2>
              <p className="text-gray-300 leading-relaxed text-lg">
                Next.js 14, TypeScript, ethers.js v6, Tailwind CSS.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 mb-1">Framework</p>
                <p className="font-medium">Next.js 14</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 mb-1">Language</p>
                <p className="font-medium">TypeScript</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 mb-1">Blockchain</p>
                <p className="font-medium">ethers.js v6</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-400 mb-1">Hardware</p>
                <p className="font-medium">libhalo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you need */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-serif mb-12 text-gray-900">
            What you need
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Hardware</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>Burner card (order from <a href="https://burner.pro" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">burner.pro</a>)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>USB NFC reader (ACR122U or compatible)</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
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

      {/* Contributing */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-12 text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Contribute
            </h2>
            <p className="text-xl mb-8 text-orange-50 max-w-2xl mx-auto">
              This is a community project. Add features, fix bugs, improve docs. 
              All contributions welcome.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="https://github.com/rdyplayerB/openburner/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-orange-50 transition-all"
              >
                Open an issue
              </a>
              <a
                href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all"
              >
                Read the docs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                <Flame className="w-5 h-5 text-orange-400" strokeWidth={2.5} />
              </div>
              <div className="text-gray-600">
                <p className="font-serif text-xl text-gray-900">OpenBurner</p>
                <p className="text-sm">
                  Created by{' '}
                  <a href="https://github.com/rdyplayerB" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">
                    Brent Oshiro
                  </a>
                  {' '}(<a href="https://x.com/rdyplayerB" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">
                    @rdyplayerB
                  </a>)
                </p>
                <p className="text-sm">MIT License</p>
              </div>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="https://github.com/rdyplayerB/openburner" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors">
                GitHub
              </a>
              <Link href="/getting-started" className="text-gray-600 hover:text-gray-900 transition-colors">
                Getting Started
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
