import type { Story, StoryDefault } from "@ladle/react";
import { Scene, type Step } from "../.ladle/scene";
import { ADDR, FRIEND, ME, NFTS } from "../.ladle/fixtures";
import { WalletDashboard } from "@/components/shared/wallet-dashboard";
import { SendNft } from "@/components/nft/send-nft";

/** Send opens from the dashboard's Send button; every story is the live sheet. */
export default {
  title: "Send",
  meta: { iframed: true, width: "phone" },
} satisfies StoryDefault;

const open: Step[] = [{ waitFor: "USD Coin" }, { click: "Send" }, { wait: 500 }];
const fill = (amount: string, to: string): Step[] => [...open, { type: ["Amount in ETH", amount] }, { type: ["Address or ENS name", to] }, { wait: 500 }];
const review = (amount: string, to: string): Step[] => [...fill(amount, to), { click: "Review" }, { waitFor: "Confirm and sign" }];

const S = (props: { steps: Step[]; knobs?: Parameters<typeof Scene>[0]["knobs"]; recents?: boolean }) => (
  <Scene steps={props.steps} knobs={props.knobs} recents={props.recents}>
    <WalletDashboard />
  </Scene>
);

export const Empty: Story = () => <S steps={open} />;
Empty.storyName = "Start";

export const RecentRecipients: Story = () => <S steps={open} recents />;

export const Filled: Story = () => <S steps={fill("0.25", FRIEND)} />;
Filled.storyName = "Ready to review";

export const InDollars: Story = () => <S steps={[...open, { click: "Enter amount in US dollars" }, { type: ["Amount in US dollars", "150"] }]} />;
InDollars.storyName = "Amount in dollars";

export const EnsName: Story = () => <S steps={[...open, { type: ["Amount in ETH", "0.1"] }, { type: ["Address or ENS name", "brantly.eth"] }, { wait: 1200 }]} />;
EnsName.storyName = "To a name";

export const EnsNotFound: Story = () => <S steps={[...open, { type: ["Address or ENS name", "nobody.eth"] }, { wait: 1200 }, { blur: "Address or ENS name" }]} />;
EnsNotFound.storyName = "Name not found";

export const InvalidAddress: Story = () => <S steps={[...open, { type: ["Amount in ETH", "0.1"] }, { type: ["Address or ENS name", "0x12ab"] }, { blur: "Address or ENS name" }]} />;

export const MoreThanBalance: Story = () => <S steps={[...open, { type: ["Amount in ETH", "250"] }]} />;

export const ChooseToken: Story = () => <S steps={[...open, { click: "Token: ETH" }]} />;

export const SendUsdc: Story = () => <S steps={[...open, { click: "Token: ETH" }, { click: "USDC" }, { type: ["Amount in USDC", "120"] }, { type: ["Address or ENS name", FRIEND] }]} />;
SendUsdc.storyName = "Another token";

export const Review: Story = () => <S steps={review("0.25", FRIEND)} />;

export const ReviewKnownRecipient: Story = () => <S recents steps={review("0.25", FRIEND)} />;
ReviewKnownRecipient.storyName = "Review, someone you've paid before";

export const ReviewToYourself: Story = () => <S steps={review("0.25", ME)} />;
ReviewToYourself.storyName = "Review, to your own address";

export const ReviewToTokenContract: Story = () => <S steps={review("0.25", ADDR.USDC)} />;
ReviewToTokenContract.storyName = "Review, to a token contract";

export const FullFlow: Story = () => (
  <S
    steps={[
      ...review("0.25", FRIEND),
      { click: "Confirm and sign" },
      { wait: 400 },
      { type: ["PIN digit 1", "1"] },
      { type: ["PIN digit 2", "2"] },
      { type: ["PIN digit 3", "3"] },
      { type: ["PIN digit 4", "4"] },
      { type: ["PIN digit 5", "5"] },
      { type: ["PIN digit 6", "6"] },
      { click: "Continue" },
    ]}
  />
);
FullFlow.storyName = "Whole flow (plays through)";

export const WrongPin: Story = () => (
  <S
    knobs={{ card: "wrong-pin" }}
    steps={[
      ...review("0.25", FRIEND),
      { click: "Confirm and sign" },
      { wait: 400 },
      ...[1, 2, 3, 4, 5, 6].map((i): Step => ({ type: [`PIN digit ${i}`, String(i)] })),
      { click: "Continue" },
    ]}
  />
);
WrongPin.storyName = "Wrong pin";

export const Nft: Story = () => (
  <Scene>
    <WalletDashboard />
    <SendNft nft={NFTS[0]} onClose={() => {}} onSuccess={() => {}} />
  </Scene>
);
Nft.storyName = "Send a collectible";
