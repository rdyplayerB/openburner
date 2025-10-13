# Deployment Guide

This guide explains how to deploy the OpenBurner marketing website to Vercel.

## Important Notes

- **Only the `/website` directory is deployed to Vercel**
- **The wallet application (root directory) remains local-only**
- This separation ensures maximum security for the wallet while providing public information

## Deploying to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add marketing website"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your `openburner` repository
   - Vercel will automatically detect the `vercel.json` configuration

3. **Configure Settings** (if needed)
   - Build Command: `cd website && npm install && npm run build`
   - Output Directory: `website/.next`
   - Install Command: `cd website && npm install`
   - Framework Preset: `Next.js`

4. **Deploy**
   - Click "Deploy"
   - Your site will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from project root**
   ```bash
   cd /path/to/openburner
   vercel
   ```

4. **Follow the prompts**
   - Answer the setup questions
   - Vercel will use the `vercel.json` configuration automatically

## Automatic Deployments

Once connected to Vercel:
- **Production**: Every push to `main` branch triggers a production deployment
- **Preview**: Every push to other branches creates a preview deployment

## Vercel Configuration

The repository includes:
- `vercel.json` - Specifies build settings and points to `/website` directory
- `.vercelignore` - Excludes wallet app from deployment

## Custom Domain

To add a custom domain:

1. Go to your project in Vercel dashboard
2. Navigate to Settings → Domains
3. Add your domain (e.g., `openburner.io`)
4. Follow DNS configuration instructions

## Environment Variables

The website doesn't require any environment variables by default. If you add features that need them:

1. Go to Settings → Environment Variables in Vercel
2. Add your variables
3. Redeploy for changes to take effect

## Monitoring

After deployment:
- Check the deployment logs in Vercel dashboard
- Monitor analytics and performance
- Set up custom domains and SSL (automatic with Vercel)

## Local Testing

To test the website locally before deploying:

```bash
cd website
npm install
npm run build
npm start
```

Visit `http://localhost:3000` to see the production build locally.

## Troubleshooting

### Build fails
- Check that all dependencies in `/website/package.json` are correct
- Verify Node.js version compatibility (18+)
- Check build logs in Vercel dashboard

### Wrong directory deployed
- Ensure `vercel.json` exists in root with correct configuration
- Verify `.vercelignore` excludes wallet app directories

### Updates not showing
- Clear Vercel cache: Deployments → [Your Deployment] → Redeploy
- Check if correct branch is deployed
- Verify files are committed and pushed to GitHub

## Support

For Vercel-specific issues:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Support](https://vercel.com/support)

For OpenBurner issues:
- [GitHub Issues](https://github.com/rdyplayerB/openburner/issues)

