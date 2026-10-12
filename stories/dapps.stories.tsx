import type { Story, StoryDefault } from "@ladle/react";
import { Scene } from "../.ladle/scene";
import { PROPOSALS, REQUESTS, requestState, type DappRequest } from "../.ladle/dapp-fixtures";
import { WalletDashboard } from "@/components/shared/wallet-dashboard";

/**
 * WalletConnect requests as the dashboard shows them. Approving works: the
 * PIN and card tap play through with the pretend card.
 */
export default {
  title: "Connected apps",
  meta: { iframed: true, width: "phone" },
} satisfies StoryDefault;

const R = ({ req, queued = 0 }: { req: DappRequest; queued?: number }) => (
  <Scene walletConnect={requestState(req, queued)}>
    <WalletDashboard />
  </Scene>
);

export const Connect: Story = () => (
  <Scene steps={[{ wait: 600 }, { click: "Connect to a dApp" }]}>
    <WalletDashboard />
  </Scene>
);
Connect.storyName = "Connect an app";

export const ConnectionRequest: Story = () => (
  <Scene walletConnect={{ pendingProposal: PROPOSALS.aave }}>
    <WalletDashboard />
  </Scene>
);

export const Send: Story = () => <R req={REQUESTS.send} />;
export const UnlimitedApproval: Story = () => <R req={REQUESTS.unlimitedApproval} queued={1} />;
export const CollectionAccess: Story = () => <R req={REQUESTS.collectionAccess} />;
CollectionAccess.storyName = "Access to a whole collection";
export const Permit2: Story = () => <R req={REQUESTS.permit2} />;
Permit2.storyName = "Permit2 signature";
export const SignIn: Story = () => <R req={REQUESTS.signIn} />;
export const SignInForAnotherSite: Story = () => <R req={REQUESTS.signInWrongSite} />;
export const Message: Story = () => <R req={REQUESTS.message} />;
export const UnreadableMessage: Story = () => <R req={REQUESTS.unreadableMessage} />;
export const RefusedMislabelled: Story = () => <R req={REQUESTS.mislabelled} />;
RefusedMislabelled.storyName = "Refused, mislabelled data";
export const KnownScamSite: Story = () => <R req={REQUESTS.scamSite} />;
export const BlindSigning: Story = () => <R req={REQUESTS.blindSign} />;
export const SwitchNetwork: Story = () => <R req={REQUESTS.switchNetwork} />;
export const AddNetwork: Story = () => <R req={REQUESTS.addNetwork} />;
