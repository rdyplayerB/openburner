import type { Story, StoryDefault } from "@ladle/react";
import { Scene } from "../.ladle/scene";
import Home from "@/app/page";

/**
 * The app's real front door (app/page.tsx). Connecting works: after the
 * pretend card is read you land on the dashboard.
 */
export default {
  title: "Welcome",
  meta: { iframed: true, width: "desktop" },
} satisfies StoryDefault;

export const Intro: Story = () => (
  <Scene connected={false} intro>
    <Home />
  </Scene>
);
Intro.storyName = "Intro 1, what OpenBurner is";

export const IntroNetworks: Story = () => (
  <Scene connected={false} intro steps={[{ click: "Next" }]}>
    <Home />
  </Scene>
);
IntroNetworks.storyName = "Intro 2, any EVM network";

export const IntroBuild: Story = () => (
  <Scene connected={false} intro steps={[{ click: "Slide 3" }]}>
    <Home />
  </Scene>
);
IntroBuild.storyName = "Intro 3, build your own";

export const IntroSigning: Story = () => (
  <Scene connected={false} intro steps={[{ click: "Slide 4" }]}>
    <Home />
  </Scene>
);
IntroSigning.storyName = "Intro 4, every signature needs your card";

export const IntroPhone: Story = () => (
  <Scene connected={false} intro knobs={{ mode: "hosted", mobile: true, pricing: false }}>
    <Home />
  </Scene>
);
IntroPhone.storyName = "Intro on a phone";
IntroPhone.meta = { width: "phone" };

export const UsbReader: Story = () => (
  <Scene connected={false} knobs={{ bridge: "down" }}>
    <Home />
  </Scene>
);
UsbReader.storyName = "Card reader, bridge not running";

export const UsbReaderReady: Story = () => (
  <Scene connected={false} knobs={{ bridge: "ready" }}>
    <Home />
  </Scene>
);
UsbReaderReady.storyName = "Card reader, ready";

export const BridgeError: Story = () => (
  <Scene connected={false} knobs={{ bridge: "down" }} steps={[{ click: "Connect with USB reader" }]}>
    <Home />
  </Scene>
);
BridgeError.storyName = "Card reader, couldn't connect";

export const PhoneAsReader: Story = () => (
  <Scene connected={false} connectionMode="gateway">
    <Home />
  </Scene>
);
PhoneAsReader.storyName = "Phone as reader";

export const Pairing: Story = () => (
  <Scene connected={false} connectionMode="gateway" knobs={{ card: "never" }} steps={[{ click: "Connect with your phone" }]}>
    <Home />
  </Scene>
);
Pairing.storyName = "Phone as reader, scan the code";

export const PairingFlow: Story = () => (
  <Scene connected={false} connectionMode="gateway" steps={[{ click: "Connect with your phone" }]}>
    <Home />
  </Scene>
);
PairingFlow.storyName = "Phone as reader, full pairing";

export const Hosted: Story = () => (
  <Scene connected={false} knobs={{ mode: "hosted", pricing: false }}>
    <Home />
  </Scene>
);
Hosted.storyName = "Hosted, desktop";

export const HostedPhone: Story = () => (
  <Scene connected={false} knobs={{ mode: "hosted", mobile: true, pricing: false }}>
    <Home />
  </Scene>
);
HostedPhone.storyName = "Hosted, phone";
HostedPhone.meta = { width: "phone" };

export const HostedPhoneReading: Story = () => (
  <Scene connected={false} knobs={{ mode: "hosted", mobile: true, pricing: false, card: "never" }} steps={[{ click: "Tap your Burner" }]}>
    <Home />
  </Scene>
);
HostedPhoneReading.storyName = "Hosted, phone, reading the card";
HostedPhoneReading.meta = { width: "phone" };

export const HostedPhoneNoCard: Story = () => (
  <Scene connected={false} knobs={{ mode: "hosted", mobile: true, pricing: false, card: "no-card" }} steps={[{ click: "Tap your Burner" }]}>
    <Home />
  </Scene>
);
HostedPhoneNoCard.storyName = "Hosted, phone, card not read";
HostedPhoneNoCard.meta = { width: "phone" };
