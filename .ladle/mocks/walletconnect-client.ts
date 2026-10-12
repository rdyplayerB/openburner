import { knobs, net } from "../scenario";
import { PROPOSALS } from "../dapp-fixtures";

/** WalletKit stand-in: pairing any wc: link shows a sample connection request. */
const sessions: any[] = [];

export function hasSavedSessionsFlag() {
  return false;
}
export function setSavedSessionsFlag() {}
export function isWalletConnectConfigured() {
  return knobs.walletConnect;
}
export function isWalletKitLoaded() {
  return true;
}
export async function getWalletKit() {
  return { on() {}, off() {} } as any;
}
export async function pairWithUri() {
  await net();
  const { useWalletConnectStore } = await import("@/store/walletconnect-store");
  useWalletConnectStore.setState({ pendingProposal: PROPOSALS.aave });
}
export async function approveProposal(proposal: any) {
  await net();
  sessions.push({ topic: `t${sessions.length + 10}`, peer: { metadata: proposal.params.proposer.metadata } });
}
export async function rejectProposal() {}
export async function respondResult() {}
export async function respondError() {}
export async function disconnectSession(topic: string) {
  const i = sessions.findIndex((s) => s.topic === topic);
  if (i >= 0) sessions.splice(i, 1);
}
export async function getActiveSessions() {
  return [...sessions];
}
