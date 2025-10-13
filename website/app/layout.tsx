import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenBurner - Open Source Web3 Wallet for Burner Ethereum Hardware Wallets",
  description: "An open-source Web3 wallet designed specifically for Burner Ethereum hardware wallets. Extends Burner use across BNB Chain, Avalanche, Blast, Linea, Mantle, Mode, Scroll, Unichain, and any custom EVM chain.",
  keywords: ["web3", "wallet", "hardware wallet", "Burner", "Burner Ethereum", "NFC", "ethereum", "crypto", "EVM", "multi-chain"],
  authors: [{ name: "@rdyplayerB" }],
  openGraph: {
    title: "OpenBurner - Open Source Web3 Wallet for Burner Ethereum Hardware Wallets",
    description: "An open-source Web3 wallet designed specifically for Burner Ethereum hardware wallets. Extends Burner use across multiple EVM chains.",
    type: "website",
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

