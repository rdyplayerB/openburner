import type { Story, StoryDefault } from "@ladle/react";
import { Scene, type Step } from "../.ladle/scene";
import { WalletDashboard } from "@/components/shared/wallet-dashboard";

/** Swap opens from the dashboard; quotes come from a fake 0x with fixture prices. */
export default {
  title: "Swap",
  meta: { iframed: true, width: "phone" },
} satisfies StoryDefault;

const open: Step[] = [{ waitFor: "USD Coin" }, { click: "Swap" }, { wait: 500 }];
const quote = (amount = "0.05"): Step[] => [
  ...open,
  { type: ["#swap-from-amount", amount] },
  { click: "Select token to receive" },
  { click: "USDC" },
  { waitFor: "1 ETH =" },
];

const S = (props: { steps: Step[]; knobs?: Parameters<typeof Scene>[0]["knobs"] }) => (
  <Scene steps={props.steps} knobs={props.knobs}>
    <WalletDashboard />
  </Scene>
);

export const Start: Story = () => <S steps={open} />;
export const ChooseToken: Story = () => <S steps={[...open, { click: "Select token to receive" }]} />;
export const Quote: Story = () => <S steps={quote()} />;
export const QuoteDetails: Story = () => <S steps={[...quote(), { click: "1 ETH =" }]} />;
export const HighPriceImpact: Story = () => <S knobs={{ priceImpact: 6.4 }} steps={[...quote(), { click: "1 ETH =" }]} />;
export const NotEnough: Story = () => <S steps={[...open, { click: "Select token to receive" }, { click: "USDC" }, { type: ["#swap-from-amount", "250"] }]} />;
NotEnough.storyName = "More than your balance";

export const NeedsApproval: Story = () => (
  <S
    knobs={{ needsApproval: true }}
    steps={[
      ...open,
      { click: "Change token to pay" },
      { click: "USDC" },
      { type: ["#swap-from-amount", "100"] },
      { click: "Select token to receive" },
      { click: "ETH" },
      { waitFor: "1 USDC =" },
    ]}
  />
);
NeedsApproval.storyName = "Selling a token that needs approval";

export const Settings: Story = () => <S steps={[...open, { click: "Swap settings" }]} />;
export const AddToken: Story = () => <S steps={[...open, { click: "Select token to receive" }, { click: "Add a token by address" }]} />;
AddToken.storyName = "Add a token by address";

export const FullFlow: Story = () => (
  <S
    steps={[
      ...quote(),
      { click: "Swap" },
      { wait: 400 },
      ...[1, 2, 3, 4, 5, 6].map((i): Step => ({ type: [`PIN digit ${i}`, String(i)] })),
      { click: "Continue" },
    ]}
  />
);
FullFlow.storyName = "Whole flow (plays through)";
