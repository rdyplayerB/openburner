# Contributing to OpenBurner

Thank you for your interest in OpenBurner! This is a personal project, so pull requests are not being accepted. However, feel free to report issues if you encounter bugs or have suggestions.

**Report issues here:** [https://github.com/rdyplayerB/openburner/issues](https://github.com/rdyplayerB/openburner/issues)

This guide will help you understand the codebase structure if you want to fork the project for your own use.

## Code Organization

OpenBurner is organized to support both local development and hosted deployment:

```
OpenBurner/
├── app/                          # Next.js app directory (page + /api proxies)
├── proxy.ts                      # Origin guard for the /api routes
├── components/
│   ├── shared/                   # Used by both local & hosted
│   │   ├── wallet-dashboard.tsx
│   │   └── price-display.tsx
│   ├── local/                    # Local mode only
│   │   ├── wallet-connect.tsx
│   │   ├── mode-toggle.tsx
│   │   ├── qr-display.tsx
│   │   └── error-modal.tsx
│   ├── hosted/                   # Hosted mode only
│   │   ├── mobile/
│   │   │   ├── mobile-connect.tsx
│   │   │   └── mobile-error-modal.tsx
│   │   └── desktop/
│   │       └── hosted-desktop-connect.tsx
│   ├── common/                   # Shared building blocks (logo, modal, token icon, ...)
│   ├── dashboard/  connect/  nft/  signing/  walletconnect/
│   └── send-token.tsx, swap-token.tsx, token-list.tsx, ...
├── lib/
│   ├── config/                   # Environment configuration
│   │   └── environment.ts
│   ├── card/                     # Card key parsing and signature checks
│   ├── mobile/                   # Phone NFC
│   │   └── nfc.ts
│   ├── burner.ts                 # USB bridge connection
│   ├── burner-gateway.ts         # Gateway mode implementation
│   ├── supported-chains.ts       # Preset networks and their RPCs
│   └── price-oracle.ts           # Pricing (local and hosted)
├── hooks/                        # Custom React hooks
│   ├── use-environment.ts
│   └── use-mobile-detection.ts
├── store/                        # Zustand state
├── stories/  .ladle/             # Every screen as a Ladle story
├── tests/                        # Vitest suite
└── docs/                         # Documentation
    ├── HOSTED_DEPLOYMENT.md
    ├── MOBILE_NFC.md
    └── CONTRIBUTING.md
```

## Environment Modes

### Local Development (`NEXT_PUBLIC_APP_MODE=local`)
- Full functionality, pricing always on
- Both bridge and gateway modes
- Debugging and development features
- Uses your own API keys (see `env.example`)

### Hosted Version (`NEXT_PUBLIC_APP_MODE=hosted`)
- Mobile: tap the card to the phone
- Desktop: gateway (phone as the reader); the USB bridge isn't available
- Pricing, swaps, NFTs and dApp connections turn on with the deployer's keys (see `docs/HOSTING.md`)
- Streamlined user experience

## Development Setup

Requires Node.js 22.12 or later.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/OpenBurner.git
   cd OpenBurner
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   # Add any API keys you have; every one is optional
   ```

4. **Start development server:**
   ```bash
   npm run dev          # Local development
   npm run dev:hosted   # Hosted version testing
   ```

## Adding New Features

### For Local Development Only
- Add components to `components/local/`
- Update local-specific logic in existing files
- Test with `npm run dev`

### For Hosted Version Only
- Add components to `components/hosted/`
- Create mobile and desktop variants if needed
- Test with `npm run dev:hosted`

### For Both Versions
- Add components to `components/shared/`
- Update shared logic in `lib/`
- Test both local and hosted modes

## Component Guidelines

### Naming Conventions
- Use PascalCase for component names
- Use descriptive names that indicate purpose
- Prefix with environment when needed (e.g., `HostedMobileConnect`)

### File Organization
- One component per file
- Co-locate related components in subdirectories
- Use index files for clean imports when needed

### Props and State
- Use TypeScript interfaces for props
- Prefer composition over inheritance
- Use custom hooks for shared logic

## Environment Detection

Use the `useEnvironment` hook to detect the current environment:

```typescript
import { useEnvironment } from '@/hooks/use-environment';

function MyComponent() {
  const { isHosted, isMobile, pricingEnabled } = useEnvironment();
  
  if (isHosted && isMobile) {
    return <MobileComponent />;
  }
  
  return <DesktopComponent />;
}
```

## Testing

### Local Testing
```bash
npm run dev
# Test with USB NFC reader and Burner Ethereum card
```

### Hosted Testing
```bash
npm run dev:hosted
# Test mobile interface on phone
# Test desktop interface on computer
```

### Checks
```bash
npm run lint         # ESLint 10 (eslint.config.mjs)
npm test             # Vitest
npm run stories      # Every screen and state in Ladle, no card needed
```

### Build Testing
```bash
npm run build:hosted
npm run start:hosted
# Test production build
```

## Forking and Customization

Since this is a personal project, you're encouraged to fork OpenBurner for your own use:

1. **Fork the repository:**
   - Click the "Fork" button on GitHub
   - Clone your fork locally

2. **Make your changes:**
   - Follow the code organization guidelines
   - Add appropriate documentation
   - Test both local and hosted modes

3. **Deploy your version:**
   - Deploy to Vercel, Netlify, or your preferred platform
   - Customize for your specific needs

**Use cases for forking:**
- Add support for specific L2s or custom chains
- Build a branded wallet for your project
- Experiment with new Burner Ethereum card features
- Create specialized tools (NFT minting, DAO voting, etc.)

## Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Use Tailwind CSS 4 for styling (theme and tokens in `app/globals.css`; see `docs/SWISS_STYLE.md`)
- Prefer functional components with hooks
- Add JSDoc comments for complex functions

## Documentation

- Update relevant documentation when adding features
- Add examples for new components
- Update deployment guides if needed
- Include screenshots for UI changes

## Questions or Issues?

Feel free to open an issue if you encounter bugs or have suggestions:

**Report issues here:** [https://github.com/rdyplayerB/openburner/issues](https://github.com/rdyplayerB/openburner/issues)

For questions about forking or customization, you can also reach out on social media or through the official Burner community channels.
