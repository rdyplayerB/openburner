# Hosted Deployment Guide

This guide explains how to deploy OpenBurner for hosted use on app.openburner.xyz.

## Overview

OpenBurner supports two deployment modes:
- **Local Development**: Full functionality with pricing, both bridge and gateway modes
- **Hosted Version**: Streamlined for phones; pricing, swaps, NFTs and dApp connections turn on with the deployer's keys

## Environment Configuration

### Local Development
```bash
NEXT_PUBLIC_APP_MODE=local
# Optional keys: see env.example
```

### Hosted Version
```bash
NEXT_PUBLIC_APP_MODE=hosted
# Optional keys (pricing, swaps, NFTs, dApp connections): see docs/HOSTING.md
```

## Build Commands

### Local Development
```bash
npm run dev          # Development server (local mode)
```

### Hosted Version
```bash
npm run dev:hosted   # Development server (hosted mode)
npm run build:hosted # Build for hosted deployment
npm run start:hosted # Start production server (hosted mode)
```

`npm run build` also builds in hosted mode; it's what Vercel runs. Node.js 22.12 or later is required.

## Deployment to Vercel

1. **Build for hosted version:**
   ```bash
   npm run build:hosted
   ```

2. **Deploy to Vercel:**
   - `vercel.json` already sets `NEXT_PUBLIC_APP_MODE=hosted` and `NEXT_PUBLIC_PRICING_ENABLED=true` for the build
   - Add the API keys you want in the project's environment variables (see [HOSTING.md](HOSTING.md))
   - Deploy to your subdomain (e.g., app.openburner.xyz)

## User Experience

### Mobile Users (Hosted)
- Single "Tap your Burner" button
- Reads the card with the phone's own NFC
- Prices shown when the deployer turns pricing on, or with the user's own CoinGecko key
- Streamlined, mobile-optimized UI

### Desktop Users (Hosted)
- Gateway mode: smartphone as the NFC reader (the USB bridge isn't available on a hosted page)
- Prices shown when the deployer turns pricing on, or with the user's own CoinGecko key
- Full wallet functionality

### Local Development
- All features enabled
- Pricing with CoinGecko API
- Both bridge and gateway modes
- Full debugging capabilities

## Code Organization

```
components/
├── shared/           # Components used by both local & hosted
├── local/            # Local development only
├── hosted/           # Hosted version only
│   ├── mobile/       # Mobile-specific components
│   └── desktop/      # Desktop-specific components
└── common/           # Shared UI components
```

## API Keys

Users can add their own keys under **Settings → API keys** (stored in their browser). See [HOSTING.md](HOSTING.md) for deployer keys and abuse protection.
