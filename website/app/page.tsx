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
                href="https://burner.pro/eth"
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
        <div className="grid md:grid-cols-[1.4fr,1fr] gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              An open source Web3 wallet for Burner Ethereum hardware wallets
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Extends BurnerOS with support for BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Scroll, Unichain, and any custom EVM chain.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/rdyplayerB/openburner/blob/main/DOCS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Get Started
              </a>
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
              width={380} 
              height={570} 
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
            Supports everything BurnerOS does (Ethereum, Base, Arbitrum, Optimism), plus BNB Chain, Avalanche, 
            Blast, Linea, Mantle, Mode, Polygon, Scroll, Unichain, and any custom EVM-compatible chain.
          </p>
          <p>
            Your Burner Ethereum card stores the keys. The wallet runs on your machine and connects to RPC endpoints you configure.
          </p>
        </div>
      </section>

      {/* Supported Networks */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Supports any EVM-compatible networks
          </h2>
          
          <div className="flex gap-4 justify-center flex-wrap mb-6 max-w-3xl mx-auto">
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
            ].map((network) => (
              <div
                key={network.name}
                className="flex flex-col items-center gap-2 w-[60px] group relative"
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center group-hover:shadow-xl transition-shadow border border-gray-200">
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
                <span className="text-xs text-gray-600 font-medium text-center leading-tight">
                  {network.name}
                </span>
                {network.isBurnerOS && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center">
                    <Image
                      src="/images/burneros.png"
                      alt="Supported by BurnerOS"
                      width={14}
                      height={14}
                      className="w-[14px] h-[14px]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mt-4">
            <Image
              src="/images/burneros.png"
              alt="Available in BurnerOS"
              width={12}
              height={12}
              className="w-3 h-3"
            />
            <span className="text-xs text-gray-400">Available in BurnerOS</span>
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
            ethers.js, libhalo, Multicall3, CoinGecko API
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
                OpenBurner is an open-source Web3 wallet designed specifically for Burner Ethereum hardware wallets. It extends the functionality of BurnerOS by adding support for additional EVM-compatible chains like BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Scroll, Unichain, and any custom EVM chain you configure.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Do I need a Burner card to use this?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Yes, OpenBurner requires a Burner Ethereum hardware wallet. The card contains a secure element that stores your private keys, which never leave the hardware. You can get a Burner Ethereum card at{' '}
                <a href="https://burner.pro/eth" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline hover:text-gray-700">
                  burner.pro/eth
                </a>.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How is this different from BurnerOS?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                BurnerOS is the official wallet app from Burner that supports Ethereum, Base, Arbitrum, and Optimism. OpenBurner is a community-built alternative that supports those same chains plus many more (including BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Polygon, Scroll, and Unichain), and allows you to add any custom EVM-compatible chain. It runs locally on your machine and gives you full control over which RPC endpoints you use.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is it secure?</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Yes. Your private keys never leave the Burner card's secure element. All signing happens on the hardware. OpenBurner communicates with the card using the libhalo library (the same one BurnerOS uses) and simply requests signatures when needed. The wallet code is open source and can be audited by anyone.
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
                Yes! OpenBurner is MIT licensed and completely open source. You can view the code, contribute features, report issues, or fork it for your own use on{' '}
                <a href="https://github.com/rdyplayerB/openburner" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline hover:text-gray-700">
                  GitHub
                </a>.
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
