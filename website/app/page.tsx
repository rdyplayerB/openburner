'use client';

import { Github, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
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

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-[1.3fr,1fr] gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              An open source Web3 wallet for Burner Ethereum hardware wallets
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Extends Burner use across any EVM-compatible chain.
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
              width={420} 
              height={630} 
              className="rounded-2xl shadow-2xl max-w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Supported Networks - Compact */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="flex gap-2 justify-center max-w-4xl mx-auto">
          {[
            { name: 'Ethereum', logo: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg', isBurnerOS: true },
            { name: 'Base', logo: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg', isBurnerOS: true },
            { name: 'BNB Chain', logo: 'https://icons.llamao.fi/icons/chains/rsz_binance.jpg', isBurnerOS: false },
            { name: 'Arbitrum One', logo: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg', isBurnerOS: true },
            { name: 'Avalanche', logo: 'https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg', isBurnerOS: false },
            { name: 'Blast', logo: 'https://icons.llamao.fi/icons/chains/rsz_blast.jpg', isBurnerOS: false },
            { name: 'Linea', logo: 'https://icons.llamao.fi/icons/chains/rsz_linea.jpg', isBurnerOS: false },
            { name: 'Mantle', logo: 'https://icons.llamao.fi/icons/chains/rsz_mantle.jpg', isBurnerOS: false },
            { name: 'Mode', logo: 'https://icons.llamao.fi/icons/chains/rsz_mode.jpg', isBurnerOS: false },
            { name: 'Optimism', logo: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg', isBurnerOS: true },
            { name: 'Polygon', logo: 'https://icons.llamao.fi/icons/chains/rsz_polygon.jpg', isBurnerOS: false },
            { name: 'Scroll', logo: 'https://icons.llamao.fi/icons/chains/rsz_scroll.jpg', isBurnerOS: false },
            { name: 'Unichain', logo: 'https://icons.llamao.fi/icons/chains/rsz_unichain.jpg', isBurnerOS: false },
            { name: 'Custom RPC', logo: '', isBurnerOS: false, isCustom: true },
          ].map((network) => (
            <div
              key={network.name}
              className="flex flex-col items-center gap-1 w-[50px] group relative"
            >
              <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow border border-gray-200">
                {network.isCustom ? (
                  <Plus className="w-3.5 h-3.5 text-gray-400" strokeWidth={2.5} />
                ) : (
                  <img
                    src={network.logo}
                    alt={network.name}
                    className="w-[18px] h-[18px] rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class="text-xs font-bold text-gray-700">${network.name[0]}</span>`;
                      }
                    }}
                  />
                )}
              </div>
              <span className="text-[9px] text-gray-600 font-medium text-center leading-tight">
                {network.name}
              </span>
              {network.isBurnerOS && (
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-white rounded-full shadow-sm border border-gray-200 flex items-center justify-center">
                  <Image
                    src="/images/burneros.png"
                    alt="Supported by BurnerOS"
                    width={8}
                    height={8}
                    className="w-2 h-2"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          <Image
            src="/images/burneros.png"
            alt="Supported in BurnerOS"
            width={10}
            height={10}
            className="w-2.5 h-2.5"
          />
          <span className="text-xs text-gray-400">Supported in BurnerOS</span>
        </div>
      </section>

      {/* What it does */}
      <section className="max-w-4xl mx-auto px-6 py-20 border-t border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          What it does
        </h2>
        <div className="text-gray-600 leading-relaxed">
          <p>
            OpenBurner extends Burner's utility by adding support for chains beyond what BurnerOS currently offers. 
            Supports everything BurnerOS does (Ethereum, Base, Arbitrum, Optimism), plus BNB Chain, Avalanche, 
            Blast, Linea, Mantle, Mode, Polygon, Scroll, Unichain, and any custom EVM-compatible chain.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-12">
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
                  get a Burner card here (10% off)
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
        <div className="max-w-4xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Open Source & Forking
          </h2>
          <p className="text-gray-600 mb-6">
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
