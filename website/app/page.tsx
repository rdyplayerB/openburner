'use client';

import { Github, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50/30 to-blue-50/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 md:pt-20 pb-8 sm:pb-12">
          <div className="grid md:grid-cols-[1.3fr,1fr] gap-8 md:gap-10 items-start animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                An open source Web3 wallet for Burner Ethereum hardware wallets
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">
                Extends Burner use across any EVM-compatible chain.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
                <Link
                  href="/getting-started"
                  className="px-6 sm:px-8 py-3 sm:py-3.5 bg-gray-900 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-800 transition-all hover:shadow-lg hover:scale-105 active:scale-100 text-center"
                >
                  Get Started
                </Link>
                <a
                  href="https://github.com/rdyplayerB/openburner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 border border-gray-300 text-gray-700 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <Github size={18} />
                  GitHub
                </a>
              </div>
            </div>
            <div className="flex flex-col gap-6 sm:gap-8 md:gap-10 md:mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              <div className="flex justify-center md:justify-end relative">
                <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full scale-75 -z-10"></div>
                <Image 
                  src="/images/Burner.jpg" 
                  alt="OpenBurner app interface showing wallet and NFC card" 
                  width={420} 
                  height={630} 
                  className="rounded-2xl shadow-2xl max-w-full h-auto ring-1 ring-gray-200/50"
                />
              </div>
              
              {/* Supported Networks - Icon Grid */}
              <div className="flex flex-col gap-3 items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-2"></div>
              <div className="flex gap-3 justify-center">
              {[
                { name: 'Ethereum', logo: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg' },
                { name: 'Base', logo: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg' },
                { name: 'BNB Chain', logo: 'https://icons.llamao.fi/icons/chains/rsz_binance.jpg' },
                { name: 'Arbitrum One', logo: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg' },
                { name: 'Avalanche', logo: 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg' },
                { name: 'Blast', logo: 'https://icons.llamao.fi/icons/chains/rsz_blast.jpg' },
                { name: 'Linea', logo: 'https://icons.llamao.fi/icons/chains/rsz_linea.jpg' },
              ].map((network) => (
                <div
                  key={network.name}
                  className="group relative flex flex-col items-center"
                >
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 transition-all border border-gray-200">
                    <img
                      src={network.logo}
                      alt={network.name}
                      className="w-7 h-7 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-sm font-bold text-gray-700">${network.name[0]}</span>`;
                        }
                      }}
                    />
                  </div>
                  <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {network.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 items-center justify-center">
              {[
                { name: 'Mantle', logo: 'https://icons.llamao.fi/icons/chains/rsz_mantle.jpg' },
                { name: 'Mode', logo: 'https://icons.llamao.fi/icons/chains/rsz_mode.jpg' },
                { name: 'Optimism', logo: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg' },
                { name: 'Polygon', logo: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg' },
                { name: 'Scroll', logo: 'https://icons.llamao.fi/icons/chains/rsz_scroll.jpg' },
                { name: 'Unichain', logo: 'https://icons.llamao.fi/icons/chains/rsz_unichain.jpg' },
              ].map((network) => (
                <div
                  key={network.name}
                  className="group relative flex flex-col items-center"
                >
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 transition-all border border-gray-200">
                    <img
                      src={network.logo}
                      alt={network.name}
                      className="w-7 h-7 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-sm font-bold text-gray-700">${network.name[0]}</span>`;
                        }
                      }}
                    />
                  </div>
                  <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {network.name}
                  </span>
                </div>
              ))}
              <div className="group relative flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-lg group-hover:scale-110 transition-all border border-gray-200">
                  <Plus className="w-5 h-5 text-gray-400" strokeWidth={2.5} />
                </div>
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Custom RPC
                </span>
              </div>
            </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-12 sm:pb-20 border-t border-gray-200">
        <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-6 sm:p-8 border border-gray-100">
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
            OpenBurner extends Burner's utility by adding support for chains beyond what BurnerOS currently offers. 
            Supports everything BurnerOS does (Ethereum, Base, Arbitrum, Optimism), plus BNB Chain, Avalanche, 
            Blast, Linea, Mantle, Mode, Polygon, Scroll, Unichain, and any custom EVM-compatible chain.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-8 sm:mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What is OpenBurner?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                OpenBurner is an open-source Web3 wallet designed specifically for Burner Ethereum hardware wallets. It extends the functionality of your Burner by adding support for additional EVM-compatible chains like BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Scroll, Unichain, and any custom EVM chain you configure.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Do I need a Burner card to use this?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Yes, OpenBurner requires a Burner hardware wallet. The card contains a secure element that stores your private keys, which never leave the hardware. You can{' '}
                <a href="https://arx-burner.myshopify.com/OPENBURNER" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline hover:text-gray-700">
                  get a Burner Ethereum here (10% off)
                </a>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How is this different from BurnerOS?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                BurnerOS is the official wallet app from Burner that supports Ethereum, Base, Arbitrum, and Optimism. OpenBurner is an alternative that supports those same chains plus many more (including BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Polygon, Scroll, and Unichain), and allows you to add any custom EVM-compatible chain. It runs locally on your machine and gives you full control over which RPC endpoints you use.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is it secure?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Yes. Your private keys never leave the Burner card's secure element. All signing happens on the hardware. OpenBurner communicates with the card using the libburner library (the same one BurnerOS uses) and simply requests signatures when needed. The wallet code is open source and can be audited by anyone.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I use it with my existing Burner card?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Absolutely. If you already have a Burner card set up with BurnerOS, you can use the same card with OpenBurner. Your addresses and keys remain the same across both applications.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How do I add a custom chain?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Check the{' '}
                <a href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline hover:text-gray-700">
                  docs
                </a>
                {' '}for instructions on adding custom networks.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is this open source?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Yes. OpenBurner is MIT licensed. You can view the code, modify it, and fork it for your own use on{' '}
                <a href="https://github.com/rdyplayerB/openburner" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline hover:text-gray-700">
                  GitHub
                </a>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What is OpenBurner built with?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                OpenBurner uses ethers.js for blockchain interactions, libburner for hardware wallet communication, Multicall3 for efficient batch RPC calls, and the CoinGecko API for real-time token prices.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How do I access OpenBurner?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                OpenBurner runs locally on your machine and requires a desktop browser with NFC support and an NFC reader.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* License & Forking */}
      <section className="border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
            Open Source & Forking
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            OpenBurner is MIT licensed. You can use it, modify it, fork it, and build your own version. This is a personal project - pull requests are not being accepted, but you're encouraged to fork and customize for your own needs. Feel free to report issues if you encounter bugs or have suggestions.
          </p>
          <div className="flex gap-4 flex-wrap">
            <a
              href="https://github.com/rdyplayerB/openburner"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-900 hover:underline"
            >
              View on GitHub →
            </a>
            <a
              href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-900 hover:underline"
            >
              Read the docs →
            </a>
            <a
              href="https://github.com/rdyplayerB/openburner/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-900 hover:underline"
            >
              Report an issue →
            </a>
          </div>
        </div>
      </section>

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
