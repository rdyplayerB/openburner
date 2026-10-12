import path from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * Ladle's Vite build of the app's components. Next-only modules get small
 * stand-ins, and anything that talks to the network or the card is swapped
 * for a fake in .ladle/mocks (driven by .ladle/scenario.ts knobs), so every
 * story is deterministic and works offline from the card.
 */
const root = path.resolve(import.meta.dirname, "..");
const r = (p: string) => path.join(root, p);
const mock = (f: string) => r(`.ladle/mocks/${f}`);

const MOCKS: Record<string, string> = {
  [r("lib/provider.ts")]: mock("provider.ts"),
  [r("lib/multicall.ts")]: mock("multicall.ts"),
  [r("lib/price-oracle.ts")]: mock("price-oracle.ts"),
  [r("lib/token-icons.ts")]: mock("token-icons.ts"),
  [r("lib/ens.ts")]: mock("ens.ts"),
  [r("lib/swap-api.ts")]: mock("swap-api.ts"),
  [r("lib/token-allowance.ts")]: mock("token-allowance.ts"),
  [r("lib/smart-signer.ts")]: mock("smart-signer.ts"),
  [r("lib/nft.ts")]: mock("nft.ts"),
  [r("lib/burner.ts")]: mock("burner.ts"),
  [r("lib/burner-gateway.ts")]: mock("burner-gateway.ts"),
  [r("lib/mobile/nfc.ts")]: mock("mobile-nfc.ts"),
  [r("lib/walletconnect/client.ts")]: mock("walletconnect-client.ts"),
  [r("lib/config/environment.ts")]: mock("environment.ts"),
  [r("hooks/use-environment.ts")]: mock("use-environment.ts"),
  [r("hooks/use-pwa.ts")]: mock("use-pwa.ts"),
};

function storyMocks(): Plugin {
  return {
    name: "openburner-story-mocks",
    enforce: "pre",
    async resolveId(source, importer, options) {
      // Mocks may import the real module they wrap.
      if (!importer || importer.includes(`${path.sep}.ladle${path.sep}mocks${path.sep}`)) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      const target = resolved && MOCKS[resolved.id.split("?")[0]];
      return target || null;
    },
  };
}

export default defineConfig({
  plugins: [storyMocks()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${root}/` },
      { find: /^next\/image$/, replacement: mock("next-image.tsx") },
      { find: /^next\/link$/, replacement: mock("next-link.tsx") },
      { find: /^next\/dynamic$/, replacement: mock("next-dynamic.tsx") },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_APP_MODE": JSON.stringify("local"),
    "process.env.NEXT_PUBLIC_PRICING_ENABLED": JSON.stringify("true"),
    "process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID": JSON.stringify("stories"),
    "process.env.NEXT_PUBLIC_0X_API_KEY": JSON.stringify(""),
    "process.env.NEXT_PUBLIC_COINGECKO_API_URL": JSON.stringify(""),
  },
  css: { postcss: root },
  publicDir: r("public"),
  server: { fs: { allow: [root] } },
});
