/** Sample dApps, connection proposals and signing requests for the dApp stories. */
import { ethers } from "ethers";
import { ADDR, FRIEND, ME } from "./fixtures";

export const DAPPS = {
  uniswap: { topic: "t1", peer: { metadata: { name: "Uniswap", url: "https://app.uniswap.org", icons: ["https://app.uniswap.org/favicon.png"] } } },
  opensea: { topic: "t2", peer: { metadata: { name: "OpenSea", url: "https://opensea.io", icons: ["https://opensea.io/static/images/logos/opensea-logo.svg"] } } },
  aave: { topic: "t3", peer: { metadata: { name: "Aave", url: "https://app.aave.com", icons: ["https://app.aave.com/favicon.ico"] } } },
};

const verified = (origin: string) => ({ verified: { validation: "VALID", origin } });
const unknown = (origin: string) => ({ verified: { validation: "UNKNOWN", origin } });

const erc20 = new ethers.Interface(["function approve(address,uint256)"]);
const erc721 = new ethers.Interface(["function setApprovalForAll(address,bool)"]);

const permit2 = {
  primaryType: "PermitSingle",
  domain: { name: "Permit2", chainId: 8453, verifyingContract: ADDR.PERMIT2 },
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    PermitDetails: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
    PermitSingle: [
      { name: "details", type: "PermitDetails" },
      { name: "spender", type: "address" },
      { name: "sigDeadline", type: "uint256" },
    ],
  },
  message: {
    details: { token: ADDR.USDC, amount: "250000000", expiration: "1792000000", nonce: "0" },
    spender: ADDR.ROUTER,
    sigDeadline: "1792000000",
  },
};

const siwe = (domain: string) =>
  ethers.hexlify(
    ethers.toUtf8Bytes(
      `${domain} wants you to sign in with your Ethereum account:\n${ME}\n\nSign in to continue to ${domain}.\n\nURI: https://${domain}\nVersion: 1\nChain ID: 8453\nNonce: k2P9xq81\nIssued At: 2026-10-11T16:20:00Z`
    )
  );

export interface DappRequest {
  session: (typeof DAPPS)[keyof typeof DAPPS];
  method: string;
  params: unknown[];
  verify?: unknown;
}

export const REQUESTS: Record<string, DappRequest> = {
  send: { session: DAPPS.uniswap, method: "eth_sendTransaction", params: [{ from: ME, to: FRIEND, value: "0x2386f26fc10000" }], verify: verified("https://app.uniswap.org") },
  unlimitedApproval: {
    session: DAPPS.uniswap,
    method: "eth_sendTransaction",
    params: [{ from: ME, to: ADDR.USDC, data: erc20.encodeFunctionData("approve", [ADDR.PERMIT2, ethers.MaxUint256]), value: "0x0" }],
    verify: verified("https://app.uniswap.org"),
  },
  collectionAccess: {
    session: DAPPS.opensea,
    method: "eth_sendTransaction",
    params: [{ from: ME, to: ADDR.NFT, data: erc721.encodeFunctionData("setApprovalForAll", [FRIEND, true]), value: "0x0" }],
    verify: unknown("https://opensea.io"),
  },
  permit2: { session: DAPPS.uniswap, method: "eth_signTypedData_v4", params: [ME, JSON.stringify(permit2)], verify: verified("https://app.uniswap.org") },
  signIn: { session: DAPPS.uniswap, method: "personal_sign", params: [siwe("app.uniswap.org"), ME], verify: verified("https://app.uniswap.org") },
  signInWrongSite: { session: DAPPS.uniswap, method: "personal_sign", params: [siwe("uniswap-claim.xyz"), ME], verify: verified("https://app.uniswap.org") },
  message: {
    session: DAPPS.uniswap,
    method: "personal_sign",
    params: [ethers.hexlify(ethers.toUtf8Bytes("Welcome to Uniswap!\n\nClick to sign and accept the Terms of Service.")), ME],
    verify: verified("https://app.uniswap.org"),
  },
  unreadableMessage: { session: DAPPS.uniswap, method: "personal_sign", params: ["0x8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63", ME], verify: verified("https://app.uniswap.org") },
  mislabelled: { session: DAPPS.uniswap, method: "eth_signTypedData_v4", params: [ME, JSON.stringify({ ...permit2, primaryType: "Login" })], verify: verified("https://app.uniswap.org") },
  scamSite: {
    session: DAPPS.uniswap,
    method: "eth_sendTransaction",
    params: [{ from: ME, to: FRIEND, value: "0x16345785d8a0000" }],
    verify: { verified: { validation: "INVALID", origin: "https://app-uniswap.org", isScam: true } },
  },
  blindSign: { session: DAPPS.uniswap, method: "eth_sign", params: [ME, "0x" + "ab".repeat(32)], verify: { verified: { validation: "INVALID", origin: "https://uniswap-airdrop.app" } } },
  switchNetwork: { session: DAPPS.uniswap, method: "wallet_switchEthereumChain", params: [{ chainId: "0xa4b1" }], verify: verified("https://app.uniswap.org") },
  addNetwork: {
    session: DAPPS.uniswap,
    method: "wallet_addEthereumChain",
    params: [{ chainId: "0x13a", chainName: "Example Chain", rpcUrls: ["https://rpc.example-chain.org"], nativeCurrency: { name: "EX", symbol: "EX", decimals: 18 } }],
    verify: verified("https://app.uniswap.org"),
  },
};

export const PROPOSALS = {
  aave: {
    id: 2,
    params: {
      proposer: { metadata: { name: "Aave", description: "Earn interest and borrow assets", url: "https://app.aave.com", icons: ["https://app.aave.com/favicon.ico"] } },
      requiredNamespaces: { eip155: { chains: ["eip155:8453"], methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData_v4"], events: ["chainChanged", "accountsChanged"] } },
      optionalNamespaces: { eip155: { chains: ["eip155:1", "eip155:42161", "eip155:324"], methods: [], events: [] } },
    },
    verifyContext: unknown("https://app.aave.com"),
  },
};

/** The WalletConnect store state that shows `req` as the open request. */
export function requestState(req: DappRequest, queued = 0) {
  return {
    sessions: [req.session],
    requestQueue: Array.from({ length: queued }, () => ({})),
    pendingRequest: { id: 1, topic: req.session.topic, params: { chainId: "eip155:8453", request: { method: req.method, params: req.params } }, verifyContext: req.verify },
  };
}
