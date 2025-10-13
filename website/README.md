# OpenBurner Website

This is the marketing website for OpenBurner, deployed on Vercel.

## Purpose

This website serves as:
- Landing page explaining OpenBurner's features
- Installation guide for the wallet application
- Documentation portal
- GitHub repository promotion

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The site will be available at `http://localhost:3002` (port 3002 to avoid conflicts with the wallet app on 3000).

## Deployment

This website is automatically deployed to Vercel when changes are pushed to the main branch.

### Vercel Configuration

The root `vercel.json` file configures Vercel to:
- Only deploy the `/website` directory
- Ignore the wallet application code
- Use the correct build and output settings

### Manual Deployment

If deploying manually:

1. Install Vercel CLI: `npm i -g vercel`
2. Run from project root: `vercel`
3. Follow the prompts

## Structure

```
website/
├── app/
│   ├── page.tsx              # Landing page
│   ├── getting-started/      # Installation guide
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── package.json
├── next.config.mjs
├── tsconfig.json
└── tailwind.config.ts
```

## Notes

- The wallet application (in the repository root) is **NOT** deployed
- Only this website directory is deployed to Vercel
- Users download and run the wallet locally for security

