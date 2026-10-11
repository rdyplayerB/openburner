import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import {
  decodeRequest,
  parseSiwe,
  verifyStatus,
  hasDanger,
  formatAmount,
  PERMIT2_ADDRESS,
  type DecodeContext,
} from "@/lib/walletconnect/decode";

const ME = "0x1111111111111111111111111111111111111111";
const SPENDER = "0x2222222222222222222222222222222222222222";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const NFT = "0x3333333333333333333333333333333333333333";

const erc = new ethers.Interface([
  "function approve(address spender, uint256 amount)",
  "function transfer(address to, uint256 amount)",
  "function setApprovalForAll(address operator, bool approved)",
]);

const usdcMeta = { [USDC.toLowerCase()]: { symbol: "USDC", decimals: 6 } };

function tx(data: string, extra: Record<string, unknown> = {}, ctx: Partial<DecodeContext> = {}) {
  return decodeRequest({
    method: "eth_sendTransaction",
    params: [{ from: ME, to: USDC, data, ...extra }],
    chainId: 1,
    account: ME,
    nativeSymbol: "ETH",
    tokens: usdcMeta,
    ...ctx,
  });
}

describe("ERC-20 approve", () => {
  it("flags unlimited approvals", () => {
    const d = tx(erc.encodeFunctionData("approve", [SPENDER, ethers.MaxUint256]));
    expect(d.action).toBe("Approve unlimited USDC");
    expect(d.risks.find((r) => r.code === "unlimited")?.level).toBe("warn");
    expect(d.tokenAddresses).toContain(USDC);
  });

  it("describes an exact approval without an unlimited flag", () => {
    const d = tx(erc.encodeFunctionData("approve", [SPENDER, 25_500_000n]));
    expect(d.action).toBe("Approve 25.5 USDC");
    expect(d.risks.some((r) => r.code === "unlimited")).toBe(false);
    expect(d.facts.find((f) => f.label === "Spender")?.address).toBe(SPENDER);
  });

  it("recognises a revoke (amount 0)", () => {
    const d = tx(erc.encodeFunctionData("approve", [SPENDER, 0n]));
    expect(d.action).toBe("Revoke USDC approval");
    expect(d.risks.find((r) => r.code === "revoke")?.level).toBe("info");
  });

  it("falls back to raw wording without token metadata", () => {
    const d = tx(erc.encodeFunctionData("approve", [SPENDER, ethers.MaxUint256]), {}, { tokens: {} });
    expect(d.action).toBe("Approve unlimited tokens");
  });
});

describe("transfers and NFTs", () => {
  it("summarises an ERC-20 transfer", () => {
    const d = tx(erc.encodeFunctionData("transfer", [SPENDER, 1_000_000n]));
    expect(d.action).toBe("Send 1 USDC");
    expect(d.facts.find((f) => f.label === "To")?.address).toBe(SPENDER);
  });

  it("flags setApprovalForAll(true) as high risk", () => {
    const d = tx(erc.encodeFunctionData("setApprovalForAll", [SPENDER, true]), { to: NFT });
    expect(d.risks.find((r) => r.code === "approval-for-all")?.level).toBe("danger");
    expect(hasDanger(d, "none")).toBe(true);
  });

  it("treats setApprovalForAll(false) as a revoke", () => {
    const d = tx(erc.encodeFunctionData("setApprovalForAll", [SPENDER, false]), { to: NFT });
    expect(d.action).toBe("Revoke collection access");
    expect(hasDanger(d, "none")).toBe(false);
  });

  it("plain native transfers have no flags", () => {
    const d = tx("0x", { to: SPENDER, value: "0x16345785d8a0000" }); // 0.1 ETH
    expect(d.action).toBe("Send 0.1 ETH");
    expect(d.risks).toHaveLength(0);
  });
});

describe("unknown contract calls", () => {
  it("shows the selector and flags value sent to the contract", () => {
    const d = tx("0xdeadbeef00000000000000000000000000000000000000000000000000000001", {
      to: NFT,
      value: ethers.parseEther("0.5").toString(),
    });
    expect(d.action).toBe("Contract interaction");
    expect(d.facts.find((f) => f.label === "Function")?.value).toBe("0xdeadbeef");
    expect(d.risks.find((r) => r.code === "value-to-contract")?.message).toContain("0.5 ETH");
  });

  it("warns when the transaction names another sender", () => {
    const d = tx("0x", { to: SPENDER, from: SPENDER, value: "1" });
    expect(d.risks.some((r) => r.code === "from-mismatch")).toBe(true);
  });
});

function typed(json: unknown, chainId = 1) {
  return decodeRequest({
    method: "eth_signTypedData_v4",
    params: [ME, JSON.stringify(json)],
    chainId,
    account: ME,
    tokens: usdcMeta,
  });
}

const PERMIT_TYPES = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};
const PERMIT2_TYPES = {
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
};

describe("typed data", () => {
  it("decodes an EIP-2612 Permit and flags unlimited", () => {
    const d = typed({
      primaryType: "Permit",
      domain: { name: "USD Coin", version: "2", chainId: 1, verifyingContract: USDC },
      types: PERMIT_TYPES,
      message: { owner: ME, spender: SPENDER, value: ethers.MaxUint256.toString(), nonce: 0, deadline: 1893456000 },
    });
    expect(d.action).toBe("Approve unlimited USDC");
    expect(d.risks.find((r) => r.code === "unlimited")?.level).toBe("warn");
    expect(d.facts.find((f) => f.label === "Valid until")?.value).toBe("2030-01-01 00:00 UTC");
  });

  it("decodes a Permit2 PermitSingle", () => {
    const d = typed({
      primaryType: "PermitSingle",
      domain: { name: "Permit2", chainId: 1, verifyingContract: PERMIT2_ADDRESS },
      types: PERMIT2_TYPES,
      message: {
        details: { token: USDC, amount: "5000000", expiration: "1893456000", nonce: "0" },
        spender: SPENDER,
        sigDeadline: "1893456000",
      },
    });
    expect(d.action).toBe("Approve 5 USDC");
    expect(d.risks.find((r) => r.code === "permit")?.level).toBe("warn");
    expect(d.tokenAddresses).toContain(USDC);
  });

  it("flags unlimited Permit2 amounts (uint160 max)", () => {
    const d = typed({
      primaryType: "PermitSingle",
      domain: { name: "Permit2", chainId: 1, verifyingContract: PERMIT2_ADDRESS },
      types: PERMIT2_TYPES,
      message: {
        details: { token: USDC, amount: ((1n << 160n) - 1n).toString(), expiration: "0", nonce: "0" },
        spender: SPENDER,
        sigDeadline: "1893456000",
      },
    });
    expect(d.action).toBe("Approve unlimited USDC");
  });

  it("flags marketplace orders as high risk", () => {
    const d = typed({
      primaryType: "OrderComponents",
      domain: { name: "Seaport", version: "1.6", chainId: 1, verifyingContract: NFT },
      types: { OrderComponents: [{ name: "offerer", type: "address" }, { name: "counter", type: "uint256" }] },
      message: { offerer: ME, counter: "0" },
    });
    expect(d.risks.find((r) => r.code === "marketplace-order")?.level).toBe("danger");
  });

  it("flags a chain mismatch and a missing contract", () => {
    const d = typed(
      { primaryType: "Mail", domain: { name: "Ether Mail", chainId: 10 }, types: { Mail: [{ name: "contents", type: "string" }] }, message: { contents: "hi" } },
      1
    );
    expect(d.risks.map((r) => r.code)).toEqual(expect.arrayContaining(["chain-mismatch", "no-contract"]));
  });
});

const siweText = (domain: string, address = ME) =>
  `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to the app.\n\nURI: https://${domain}\nVersion: 1\nChain ID: 1\nNonce: abc123\nIssued At: 2026-10-11T12:00:00Z`;

function personal(message: string, dappUrl?: string) {
  return decodeRequest({
    method: "personal_sign",
    params: [ethers.hexlify(ethers.toUtf8Bytes(message)), ME],
    chainId: 1,
    account: ME,
    dappUrl,
    dappName: "Test dApp",
  });
}

describe("personal_sign and SIWE", () => {
  it("parses SIWE fields", () => {
    const s = parseSiwe(siweText("app.example.com"));
    expect(s?.domain).toBe("app.example.com");
    expect(s?.nonce).toBe("abc123");
    expect(s?.chainId).toBe(1);
    expect(s?.statement).toBe("Sign in to the app.");
  });

  it("accepts a sign-in for the dApp's own domain", () => {
    const d = personal(siweText("app.example.com"), "https://app.example.com");
    expect(d.kind).toBe("siwe");
    expect(d.action).toBe("Sign in to app.example.com");
    expect(d.risks).toHaveLength(0);
  });

  it("flags a SIWE domain mismatch as high risk", () => {
    const d = personal(siweText("app.example.com"), "https://evil.example.net");
    expect(d.risks.find((r) => r.code === "siwe-domain-mismatch")?.level).toBe("danger");
  });

  it("flags a SIWE message for another wallet", () => {
    const d = personal(siweText("app.example.com", SPENDER), "https://app.example.com");
    expect(d.risks.some((r) => r.code === "siwe-address-mismatch")).toBe(true);
  });

  it("flags unreadable (binary) messages", () => {
    const d = decodeRequest({ method: "personal_sign", params: ["0xff00fe01", ME], chainId: 1, account: ME });
    expect(d.risks.find((r) => r.code === "unreadable")).toBeTruthy();
    expect(d.raw).toBe("0xff00fe01");
  });

  it("decodes plain text", () => {
    const d = personal("Hello from the dApp");
    expect(d.kind).toBe("message");
    expect(d.raw).toBe("Hello from the dApp");
  });
});

describe("helpers", () => {
  it("formats amounts", () => {
    expect(formatAmount(1234567890000n, 6)).toBe("1,234,567.89");
    expect(formatAmount(1n, 18)).toBe("< 0.000001");
    expect(formatAmount(0n, 18)).toBe("0");
  });

  it("reads WalletConnect Verify results", () => {
    expect(verifyStatus(undefined).status).toBe("none");
    expect(verifyStatus({ verified: { validation: "VALID", origin: "https://a.io" } }).status).toBe("verified");
    expect(verifyStatus({ verified: { validation: "INVALID" } }).status).toBe("mismatch");
    expect(verifyStatus({ verified: { validation: "UNKNOWN" } }).status).toBe("unverified");
    expect(verifyStatus({ verified: { validation: "VALID", isScam: true } }).status).toBe("scam");
  });

  it("refuses eth_sign", () => {
    const d = decodeRequest({ method: "eth_sign", params: [ME, "0x00"], chainId: 1 });
    expect(d.kind).toBe("unsupported");
    expect(hasDanger(d, "none")).toBe(true);
  });
});
