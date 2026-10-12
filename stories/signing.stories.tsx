import type { Story, StoryDefault } from "@ladle/react";
import { Scene } from "../.ladle/scene";
import { FRIEND } from "../.ladle/fixtures";
import { WalletDashboard } from "@/components/shared/wallet-dashboard";
import { PinInput } from "@/components/pin-input";
import { TransactionStatusModal, type TransactionSummary } from "@/components/transaction-completion-modal";
import type { ProgressStep } from "@/components/signing/signing-progress";
import type { CardPhase } from "@/store/signing-store";

/** PIN, card tap and the transaction sheet, each held on one moment. */
export default {
  title: "Signing",
  meta: { iframed: true, width: "phone" },
} satisfies StoryDefault;

const STEPS: ProgressStep[] = [
  { key: "prepare", label: "Prepare transaction" },
  { key: "sign", label: "Sign with your Burner", card: true },
  { key: "send", label: "Send to Base" },
];
const noop = () => {};

const Progress = ({ current, phase, knobs, gateway }: { current: string; phase: CardPhase; knobs?: Parameters<typeof Scene>[0]["knobs"]; gateway?: boolean }) => (
  <Scene signing={phase} knobs={knobs} connectionMode={gateway ? "gateway" : "bridge"}>
    <WalletDashboard />
    <PinInput isVisible isLoading onSubmit={noop} onCancel={noop} progress={{ steps: STEPS, current }} />
  </Scene>
);

export const EnterPin: Story = () => (
  <Scene>
    <WalletDashboard />
    <PinInput isVisible onSubmit={noop} onCancel={noop} title="Confirm with your PIN" />
  </Scene>
);
EnterPin.storyName = "Enter pin";

export const WrongPin: Story = () => (
  <Scene>
    <WalletDashboard />
    <PinInput isVisible onSubmit={noop} onCancel={noop} title="Confirm with your PIN" error="Incorrect PIN. Please try again." />
  </Scene>
);
WrongPin.storyName = "Wrong pin";

export const Preparing: Story = () => <Progress current="prepare" phase="idle" />;
export const TapUsbReader: Story = () => <Progress current="sign" phase="tap" />;
TapUsbReader.storyName = "Tap your card, card reader";
export const TapPhoneGateway: Story = () => <Progress current="sign" phase="tap" gateway />;
TapPhoneGateway.storyName = "Tap your card, phone gateway";
export const TapPhone: Story = () => <Progress current="sign" phase="tap" knobs={{ mode: "hosted", mobile: true, pricing: false }} />;
TapPhone.storyName = "Tap your card, phone";
export const Signed: Story = () => <Progress current="sign" phase="signed" />;
export const Sending: Story = () => <Progress current="send" phase="signed" />;

const send: TransactionSummary = { kind: "send", txHash: "0x" + "4f".repeat(32), chainId: 8453, fromToken: "ETH", fromAmount: "0.25", recipient: FRIEND };
const swap: TransactionSummary = { kind: "swap", txHash: "0x" + "7a".repeat(32), chainId: 8453, fromToken: "ETH", fromAmount: "0.05", toToken: "USDC", toAmount: "126.39" };

const Tx = ({ status, tx = send }: { status: "waiting" | "success" | "failed" | "pending"; tx?: TransactionSummary }) => (
  <Scene>
    <WalletDashboard />
    <TransactionStatusModal status={status} tx={tx} chainName="Base" onClose={noop} />
  </Scene>
);

export const Confirming: Story = () => <Tx status="waiting" />;
export const Sent: Story = () => <Tx status="success" />;
export const SwapComplete: Story = () => <Tx status="success" tx={swap} />;
export const Failed: Story = () => <Tx status="failed" />;
export const StillPending: Story = () => <Tx status="pending" />;
