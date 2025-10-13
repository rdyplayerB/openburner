'use client';

import { Github, Shield, Zap, Lock, Layers, Code2, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
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
              <Link href="/getting-started" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                Getting Started
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-full mb-8">
            <Lock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-900 dark:text-orange-200">
              Hardware-Secured • Local-First • Open Source
            </span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-orange-500 via-red-600 to-orange-500 bg-clip-text text-transparent">
              Hardware-Secured
            </span>
            <br />
            <span className="text-gray-900 dark:text-white">Web3 Wallet</span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            A production-ready Web3 wallet with hardware-secured key storage using HaLo NFC chips. 
            Run locally for maximum security. Your keys never leave the chip.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/getting-started"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Download className="w-5 h-5" />
              <span>Get Started</span>
            </Link>
            <a
              href="https://github.com/rdyplayerB/openburner"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-8 py-4 rounded-lg font-semibold hover:border-gray-400 dark:hover:border-gray-600 transition-all"
            >
              <Github className="w-5 h-5" />
              <span>View on GitHub</span>
            </a>
          </div>

          <div className="mt-12 flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>MIT Licensed</span>
            </div>
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4" />
              <span>TypeScript + Next.js</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Multi-Chain</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Local-First */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-gray-200 dark:border-gray-800">
        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 rounded-2xl p-8 sm:p-12">
          <div className="flex items-start space-x-4 mb-6">
            <div className="bg-orange-500 p-3 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Why Run Locally?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
                OpenBurner is designed to run on your local machine, not as a hosted web app. 
                This architecture provides maximum security for managing your crypto assets.
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg">
              <Lock className="w-8 h-8 text-orange-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Full Control</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No remote servers, no third parties. You have complete control over your wallet and transactions.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg">
              <Shield className="w-8 h-8 text-orange-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Reduced Attack Surface</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Running locally eliminates web-based attack vectors and reduces exposure to network threats.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg">
              <Code2 className="w-8 h-8 text-orange-500 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Auditable Code</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Open source and running on your machine means you can audit exactly what code is executing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Built for Security & Usability
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Hardware-level security meets modern UX. Manage your crypto assets with confidence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Hardware-Secured Keys"
            description="Private keys generated and stored in tamper-resistant secure element chips. Keys never leave the hardware."
          />
          
          <FeatureCard
            icon={<Layers className="w-8 h-8" />}
            title="Multi-Chain Support"
            description="Support for Ethereum, Base, Arbitrum, Optimism, Polygon, and any custom EVM-compatible chain."
          />
          
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Efficient Operations"
            description="Multicall3 integration for batch queries and advanced caching for optimal performance."
          />
          
          <FeatureCard
            icon={<Lock className="w-8 h-8" />}
            title="Physical Security"
            description="Requires physical NFC chip tap to sign transactions. No remote signing vulnerabilities."
          />
          
          <FeatureCard
            icon={<Code2 className="w-8 h-8" />}
            title="Modern Stack"
            description="Built with Next.js 14, TypeScript, ethers.js v6, and Tailwind CSS. Clean, maintainable code."
          />
          
          <FeatureCard
            icon={<ExternalLink className="w-8 h-8" />}
            title="Token Management"
            description="View balances for ETH and ERC-20 tokens with real-time prices from CoinGecko API."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-gray-200 dark:border-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Simple architecture, maximum security
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
              1
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Download & Install
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Clone from GitHub, install dependencies, and run locally on your machine.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
              2
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connect HaLo Chip
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Set up HaLo Bridge and connect your NFC reader. Tap your HaLo chip to access your wallet.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
              3
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Manage Assets
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              View balances, send transactions, and manage your crypto with hardware-secured signing.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-orange-50">
            Download OpenBurner and take control of your crypto security.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/getting-started"
              className="inline-flex items-center space-x-2 bg-white text-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-orange-50 transition-all"
            >
              <Download className="w-5 h-5" />
              <span>Installation Guide</span>
            </Link>
            <a
              href="https://github.com/rdyplayerB/openburner"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all"
            >
              <Github className="w-5 h-5" />
              <span>View Source Code</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="text-2xl">🔥</div>
                <span className="text-xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                  OpenBurner
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Open source Web3 wallet with hardware-secured key storage. Built for security, privacy, and user control.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>
                  <Link href="/getting-started" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    Getting Started
                  </Link>
                </li>
                <li>
                  <a href="https://github.com/rdyplayerB/openburner" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="https://github.com/rdyplayerB/openburner/issues" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    Issues
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Community</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>
                  <a href="https://github.com/rdyplayerB/openburner" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://arx.org" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                    HaLo Chips
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 mt-12 pt-8 text-center text-gray-600 dark:text-gray-400">
            <p>© 2025 OpenBurner. Open source under MIT License.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="text-orange-500 mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

