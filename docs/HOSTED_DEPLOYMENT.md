# Hosted Deployment Guide

This guide explains how to deploy OpenBurner for hosted use on app.openburner.xyz.

## Overview

OpenBurner supports two deployment modes:
- **Local Development**: Full functionality with pricing, both bridge and gateway modes
- **Hosted Version**: Streamlined for mobile users with pricing disabled

## Environment Configuration

### Local Development
```bash
NEXT_PUBLIC_APP_MODE=local
NEXT_PUBLIC_COINGECKO_API_KEY=your_api_key_here
```

### Hosted Version
```bash
NEXT_PUBLIC_APP_MODE=hosted
# No API key needed - pricing disabled
```

## Build Commands

### Local Development
```bash
npm run dev          # Development server (local mode)
npm run build        # Build for local deployment
npm run start        # Start production server (local mode)
```

### Hosted Version
```bash
npm run dev:hosted   # Development server (hosted mode)
npm run build:hosted # Build for hosted deployment
npm run start:hosted # Start production server (hosted mode)
```

## Deployment to Vercel

1. **Build for hosted version:**
   ```bash
   npm run build:hosted
   ```

2. **Deploy to Vercel:**
   - Set environment variable: `NEXT_PUBLIC_APP_MODE=hosted`
   - Deploy to your subdomain (e.g., app.openburner.xyz)

## User Experience

### Mobile Users (Hosted)
- Single "Tap Your Burner" button
- Uses smartphone NFC or gateway mode
- No pricing information (disabled)
- Streamlined, mobile-optimized UI

### Desktop Users (Hosted)
- Bridge mode: USB NFC reader
- Gateway mode: Smartphone as NFC reader
- No pricing information (disabled)
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

## Future Enhancements

The codebase is prepared for future pricing implementation:
- User API key configuration
- Encrypted local storage
- Multiple pricing sources
- Community pricing cache

See `lib/config/pricing.ts` for implementation details.
