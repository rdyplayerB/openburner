/** @type {import('@ladle/react').UserConfig} */
const config = {
  stories: "stories/**/*.stories.tsx",
  viteConfig: ".ladle/vite.config.ts",
  outDir: "ladle-build",
  // Relative asset paths, so the static build works from any folder or host path.
  base: "./",
  defaultStory: "dashboard--overview",
  // Sections in the order you meet them in the app.
  storyOrder: ["welcome--*", "dashboard--*", "send--*", "signing--*", "swap--*", "connected-apps--*"],
  addons: {
    theme: { enabled: true, defaultState: "light" },
    width: {
      enabled: true,
      options: { phone: 390, tablet: 820, desktop: 1180 },
      defaultState: 0,
    },
    a11y: { enabled: true },
    rtl: { enabled: false },
  },
};

export default config;
