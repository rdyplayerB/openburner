import type { Story, StoryDefault } from "@ladle/react";
import { Scene } from "../.ladle/scene";
import { WalletDashboard } from "@/components/shared/wallet-dashboard";

export default {
  title: "Dashboard",
  meta: { iframed: true, width: "desktop" },
} satisfies StoryDefault;

const D = () => <WalletDashboard />;

export const Overview: Story = () => (
  <Scene>
    <D />
  </Scene>
);

export const Phone: Story = () => (
  <Scene>
    <D />
  </Scene>
);
Phone.meta = { width: "phone" };

export const PricesOff: Story = () => (
  <Scene knobs={{ mode: "hosted", pricing: false }}>
    <D />
  </Scene>
);
PricesOff.storyName = "Prices off";

export const WithEnsName: Story = () => (
  <Scene knobs={{ ens: true }}>
    <D />
  </Scene>
);
WithEnsName.storyName = "With a name";

export const Loading: Story = () => (
  <Scene knobs={{ balances: "loading" }}>
    <D />
  </Scene>
);

export const NetworkDown: Story = () => (
  <Scene knobs={{ balances: "error" }}>
    <D />
  </Scene>
);
NetworkDown.storyName = "Network unreachable";

export const EmptyWallet: Story = () => (
  <Scene knobs={{ balances: "empty", nfts: false }} activity={false}>
    <D />
  </Scene>
);

export const PhoneDisconnected: Story = () => (
  <Scene connectionMode="gateway" knobs={{ phoneLink: "executor-away" }}>
    <D />
  </Scene>
);
PhoneDisconnected.storyName = "Phone gateway dropped";

export const NetworkPicker: Story = () => (
  <Scene steps={[{ wait: 600 }, { click: "Network: Base" }]}>
    <D />
  </Scene>
);

export const Menu: Story = () => (
  <Scene steps={[{ wait: 600 }, { click: "Menu" }]}>
    <D />
  </Scene>
);

export const TokenDetails: Story = () => (
  <Scene steps={[{ waitFor: "Coinbase Wrapped BTC" }, { click: "Coinbase Wrapped BTC" }]}>
    <D />
  </Scene>
);
TokenDetails.meta = { width: "phone" };

export const SearchNoMatch: Story = () => (
  <Scene steps={[{ waitFor: "USD Coin" }, { type: ["Search tokens by name, symbol or address", "pepe"] }]}>
    <D />
  </Scene>
);
SearchNoMatch.storyName = "Search, no match";
SearchNoMatch.meta = { width: "phone" };

export const AddToken: Story = () => (
  <Scene steps={[{ waitFor: "USD Coin" }, { click: "Add a token" }]}>
    <D />
  </Scene>
);
AddToken.storyName = "Add a token";
AddToken.meta = { width: "phone" };

// The example QFTs live on Ethereum, so the story switches there first.
export const Collectibles: Story = () => (
  <Scene steps={[{ wait: 600 }, { click: "Network: Base" }, { click: "Ethereum" }, { wait: 600 }, { click: "Collectibles" }]}>
    <D />
  </Scene>
);

export const CollectiblesEmpty: Story = () => (
  <Scene knobs={{ nfts: false }} steps={[{ wait: 600 }, { click: "Collectibles" }]}>
    <D />
  </Scene>
);
CollectiblesEmpty.storyName = "Collectibles, none yet";

export const Activity: Story = () => (
  <Scene steps={[{ wait: 600 }, { click: "Activity" }]}>
    <D />
  </Scene>
);

export const ActivityEmpty: Story = () => (
  <Scene activity={false} steps={[{ wait: 600 }, { click: "Activity" }]}>
    <D />
  </Scene>
);
ActivityEmpty.storyName = "Activity, none yet";

export const Receive: Story = () => (
  <Scene steps={[{ wait: 600 }, { click: "Receive" }]}>
    <D />
  </Scene>
);
Receive.meta = { width: "phone" };

export const Settings: Story = () => (
  <Scene steps={[{ wait: 600 }, { click: "Menu" }, { click: "Settings" }]}>
    <D />
  </Scene>
);
Settings.meta = { width: "phone" };
