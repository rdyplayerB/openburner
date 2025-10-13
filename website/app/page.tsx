'use client';

import { Github } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="font-medium text-gray-900">
              OpenBurner
            </Link>
            <div className="flex items-center gap-8">
              <a
                href="https://burner.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                Get a Burner
              </a>
              <Link href="/getting-started" className="text-gray-600 hover:text-gray-900 text-sm">
                Docs
              </Link>
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

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-[1.2fr,1fr] gap-16 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              An open source Web3 wallet for Burner cards
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Extends BurnerOS with support for Blast, Scroll, Linea, zkSync Era, and any custom EVM chain.
            </p>
            <div className="flex gap-4">
              <Link 
                href="/getting-started" 
                className="px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Get Started
              </Link>
              <a
                href="https://github.com/rdyplayerB/openburner"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Github size={18} />
                GitHub
              </a>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <Image 
              src="/images/Burner.jpg" 
              alt="OpenBurner app interface showing wallet and NFC card" 
              width={500} 
              height={750} 
              className="rounded-2xl shadow-2xl max-w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Quick Install */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
          <code className="text-green-400 font-mono text-sm">
            git clone https://github.com/rdyplayerB/openburner.git
            <br />
            cd openburner && npm install && npm run dev
          </code>
        </div>
      </section>

      {/* What it does */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          What it does
        </h2>
        <div className="space-y-6 text-gray-600 leading-relaxed">
          <p>
            OpenBurner extends Burner's utility by adding support for chains beyond what BurnerOS currently offers. 
            Supports everything BurnerOS does (Ethereum, Base, Arbitrum, Optimism, Polygon), plus Blast, Scroll, 
            Linea, zkSync Era, and any custom EVM-compatible chain.
          </p>
          <p>
            Your Burner card stores the keys. The wallet runs on your machine and connects to RPC endpoints you configure.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Hardware-secured</h3>
              <p className="text-sm text-gray-600">Private keys never leave the secure element</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Multi-chain</h3>
              <p className="text-sm text-gray-600">Any EVM-compatible blockchain</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Open source</h3>
              <p className="text-sm text-gray-600">MIT licensed, community-driven</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Built with
          </h2>
          <p className="text-gray-600">
            Next.js 14, React 18, TypeScript, ethers.js v6, libhalo (NFC), Zustand, Tailwind CSS
          </p>
        </div>
      </section>

      {/* Contribute */}
      <section className="border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Contribute
          </h2>
          <p className="text-gray-600 mb-6">
            This is a community project. Add features, fix bugs, improve docs. All contributions welcome.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/rdyplayerB/openburner/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-900 hover:underline"
            >
              Open an issue →
            </a>
            <a
              href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-900 hover:underline"
            >
              Read the docs →
            </a>
          </div>
        </div>
      </section>

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
