# Contributing to OpenBurner

Thank you for your interest in OpenBurner! This is a personal project, so pull requests are not being accepted. However, feel free to report issues if you encounter bugs or have suggestions.

**Report issues here:** [https://github.com/rdyplayerB/openburner/issues](https://github.com/rdyplayerB/openburner/issues)

This guide will help you understand the codebase structure if you want to fork the project for your own use.

## Code Organization

OpenBurner is organized to support both local development and hosted deployment:

```
OpenBurner/
├── app/                          # Next.js app directory
├── components/
│   ├── shared/                   # Components used by both local & hosted
│   │   ├── wallet-dashboard.tsx
│   │   ├── token-list.tsx
│   │   ├── send-token.tsx
│   │   └── price-display.tsx
│   ├── local/                    # Local development only
│   │   ├── wallet-connect.tsx    # Original implementation
│   │   ├── mode-toggle.tsx
│   │   ├── qr-display.tsx
│   │   └── error-modal.tsx
│   ├── hosted/                   # Hosted version only
│   │   ├── mobile/
│   │   │   ├── mobile-connect.tsx
│   │   │   └── mobile-error-modal.tsx
│   │   └── desktop/
│   │       └── hosted-desktop-connect.tsx
│   └── common/                   # Shared UI components
│       ├── theme-toggle.tsx
│       └── error-modal.tsx
├── lib/
│   ├── config/                   # Environment configuration
│   │   └── environment.ts
│   ├── mobile/                   # Mobile-specific functionality
│   │   └── nfc.ts
│   ├── burner.ts                 # Core Burner functionality
│   ├── burner-gateway.ts         # Gateway mode implementation
│   └── price-oracle.ts           # Pricing (disabled on hosted)
├── hooks/                        # Custom React hooks
│   ├── use-environment.ts
│   └── use-mobile-detection.ts
└── docs/                         # Documentation
    ├── HOSTED_DEPLOYMENT.md
    ├── MOBILE_NFC.md
    └── CONTRIBUTING.md
```

## Environment Modes

### Local Development (`NEXT_PUBLIC_APP_MODE=local`)
- Full functionality with pricing
- Both bridge and gateway modes
- Debugging and development features
- Uses your CoinGecko API key

### Hosted Version (`NEXT_PUBLIC_APP_MODE=hosted`)
- Mobile: Single tap interface
- Desktop: Bridge and gateway options
- Pricing disabled (no API costs)
- Streamlined user experience

## Development Setup

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
   cp .env.local.example .env.local
   # Edit .env.local with your CoinGecko API key
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
# Test with USB NFC reader and Burner card
```

### Hosted Testing
```bash
npm run dev:hosted
# Test mobile interface on phone
# Test desktop interface on computer
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
- Experiment with new Burner card features
- Create specialized tools (NFT minting, DAO voting, etc.)

## Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Use Tailwind CSS for styling
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
