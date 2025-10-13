import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenBurner - Hardware-Secured Web3 Wallet",
  description: "A production-ready Web3 wallet with hardware-secured key storage using HaLo NFC chips. Built with Next.js, TypeScript, and ethers.js.",
  keywords: ["web3", "wallet", "hardware wallet", "NFC", "HaLo", "ethereum", "crypto"],
  authors: [{ name: "OpenBurner Team" }],
  openGraph: {
    title: "OpenBurner - Hardware-Secured Web3 Wallet",
    description: "A production-ready Web3 wallet with hardware-secured key storage using HaLo NFC chips.",
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

