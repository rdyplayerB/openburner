import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenBurner",
  description: "Simple Web3 Wallet with HaLo Chip Integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

