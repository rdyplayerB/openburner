"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [websiteUrl, setWebsiteUrl] = useState("");

  useEffect(() => {
    // Website is a separate app running on port 3002
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    setWebsiteUrl(`${protocol}//${hostname}:3002`);
  }, []);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image 
            src="/images/openburnerlogo.svg" 
            alt="OpenBurner logo" 
            width={48} 
            height={48} 
            className="w-12 h-12"
          />
          <h1 className="text-4xl font-bold text-black tracking-tight mt-1">
            OpenBurner
          </h1>
        </div>
        <div className="flex flex-col gap-4">
          <Link 
            href="/wallet" 
            className="px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-lg"
          >
            Open Wallet App
          </Link>
          <a 
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 border border-gray-300 text-gray-900 rounded-md hover:bg-gray-50 transition-colors text-lg"
          >
            View Website
          </a>
        </div>
      </div>
    </main>
  );
}
