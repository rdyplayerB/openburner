import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// PWA metadata - only applies to mobile hosted mode
const isHosted = process.env.NEXT_PUBLIC_APP_MODE === 'hosted';

export const metadata: Metadata = {
  title: "OpenBurner",
  description: "Start using OpenBurner",
  icons: {
    icon: '/openburnerlogo.ico',
  },
  // PWA-specific metadata
  ...(isHosted && {
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'OpenBurner',
    },
    formatDetection: {
      telephone: false,
    },
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'msapplication-TileColor': '#FF6B35',
      'msapplication-config': '/browserconfig.xml',
    },
  }),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FF6B35',
};

// Reads zustand's persisted theme ("theme-storage") synchronously.
const THEME_BOOTSTRAP = `try{var t=JSON.parse(localStorage.getItem("theme-storage")||"{}");if(t&&t.state&&t.state.isDarkMode){document.documentElement.classList.add("dark")}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.className} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the persisted theme before first paint (no light->dark flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {/* PWA meta tags - only for hosted mode */}
        {isHosted && (
          <>
            <link rel="manifest" href="/manifest.json" />
            <meta name="theme-color" content="#FF6B35" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="OpenBurner" />
            <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
            <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
            <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-120x120.png" />
            <meta name="msapplication-TileColor" content="#FF6B35" />
            <meta name="msapplication-config" content="/browserconfig.xml" />
            {/* Android-specific meta tags */}
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="application-name" content="OpenBurner" />
            <meta name="msapplication-tooltip" content="OpenBurner Mobile Wallet" />
            <meta name="msapplication-starturl" content="/" />
          </>
        )}
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

