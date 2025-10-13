import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenBurner - Open Source Web3 Wallet for Burner Ethereum Hardware Wallets",
  description: "An open-source Web3 wallet designed specifically for Burner Ethereum hardware wallets. Extends Burner use across BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Scroll, Unichain, and any custom EVM chain.",
  keywords: ["web3", "wallet", "hardware wallet", "Burner", "Burner Ethereum", "NFC", "ethereum", "crypto", "EVM", "multi-chain"],
  authors: [{ name: "@rdyplayerB" }],
  icons: {
    icon: '/images/openburnerlogo.ico',
  },
  openGraph: {
    title: "OpenBurner - Open Source Web3 Wallet for Burner Ethereum Hardware Wallets",
    description: "An open-source Web3 wallet designed specifically for Burner Ethereum hardware wallets. Extends Burner use across multiple EVM chains.",
    type: "website",
    images: [
      {
        url: "/images/og-image.svg",
        width: 1200,
        height: 630,
        alt: "OpenBurner - Open Source Web3 Wallet for Burner Ethereum Hardware Wallets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenBurner - Open Source Web3 Wallet for Burner Ethereum Hardware Wallets",
    description: "An open-source Web3 wallet designed specifically for Burner Ethereum hardware wallets. Extends Burner use across multiple EVM chains.",
    images: ["/images/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

