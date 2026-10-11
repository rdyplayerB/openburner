import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { decodeRequest } from "@/lib/walletconnect/decode";
import {
  parseChainIdParam,
  parsePersonalSignParams,
  parseTxParams,
  parseTypedDataParams,
  RequestParamsError,
} from "@/lib/walletconnect/params";

/**
 * The review screen and the signer read requests through the same parsers.
 * These cases are the ways a dApp could otherwise show one thing and get
 * another signed.
 */

const ME = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const login = {
  primaryType: "Login",
  domain: { name: "Friendly App", chainId: 1 },
  types: { Login: [{ name: "hello", type: "string" }] },
  message: { hello: "world" },
};
const permit2 = {
  primaryType: "PermitSingle",
  domain: { name: "Permit2", chainId: 1, verifyingContract: PERMIT2 },
  types: {
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
    details: { token: USDC, amount: ((1n << 160n) - 1n).toString(), expiration: "0", nonce: "0" },
    spender: OTHER,
    sigDeadline: "1893456000",
  },
};

describe("typed data params", () => {
  it("refuses two payloads with no account (can't tell which one is signed)", () => {
    expect(() => parseTypedDataParams([JSON.stringify(login), JSON.stringify(permit2)], ME)).toThrow(RequestParamsError);
    const d = decodeRequest({ method: "eth_signTypedData_v4", params: [JSON.stringify(login), JSON.stringify(permit2)], chainId: 1, account: ME });
    expect(d.kind).toBe("unsupported");
  });

  it("accepts either order when one parameter is the connected account", () => {
    expect(parseTypedDataParams([ME, JSON.stringify(permit2)], ME).primaryType).toBe("PermitSingle");
    expect(parseTypedDataParams([JSON.stringify(permit2), ME], ME).primaryType).toBe("PermitSingle");
  });

  it("refuses a request for a different account", () => {
    expect(() => parseTypedDataParams([OTHER, JSON.stringify(permit2)], ME)).toThrow(/different account/);
  });

  it("refuses a permit mislabelled as something harmless", () => {
    const disguised = { ...permit2, primaryType: "Login" };
    expect(() => parseTypedDataParams([ME, JSON.stringify(disguised)], ME)).toThrow(/labelled "Login"/);
    const d = decodeRequest({ method: "eth_signTypedData_v4", params: [ME, JSON.stringify(disguised)], chainId: 1, account: ME });
    expect(d.kind).toBe("unsupported");
    expect(d.risks[0].level).toBe("danger");
  });

  it("derives the primary type when the dApp omits it", () => {
    const { primaryType: _omit, ...rest } = permit2;
    const d = decodeRequest({ method: "eth_signTypedData_v4", params: [ME, JSON.stringify(rest)], chainId: 1, account: ME });
    expect(d.action).toMatch(/^Approve unlimited/);
  });
});

describe("personal_sign params", () => {
  it("signs the parameter that isn't the account, in either order", () => {
    expect(parsePersonalSignParams(["0x68656c6c6f", ME], ME)).toBe("0x68656c6c6f");
    expect(parsePersonalSignParams([ME, "hello"], ME)).toBe("hello");
  });

  it("doesn't swap when the message itself looks like an address", () => {
    // [message, account]: the 20-byte message is what gets signed and shown.
    expect(parsePersonalSignParams([OTHER, ME], ME)).toBe(OTHER);
  });

  it("refuses a message addressed to another account", () => {
    expect(() => parsePersonalSignParams(["hello", OTHER], ME)).toThrow(/different account/);
  });
});

describe("transaction params", () => {
  it("uses input when data is absent, and refuses conflicting fields", () => {
    expect(parseTxParams([{ to: OTHER, input: "0xabcdef01" }]).data).toBe("0xabcdef01");
    expect(() => parseTxParams([{ to: OTHER, data: "0x01", input: "0x02" }])).toThrow(/conflicting/);
  });

  it("refuses a non-address recipient", () => {
    expect(() => parseTxParams([{ to: "nope" }])).toThrow(RequestParamsError);
  });
});

describe("chain id params", () => {
  it("reads hex, decimal strings and numbers the same way", () => {
    expect(parseChainIdParam("0x2105")).toBe(8453);
    expect(parseChainIdParam("8453")).toBe(8453);
    expect(parseChainIdParam(8453)).toBe(8453);
    expect(() => parseChainIdParam("base")).toThrow(RequestParamsError);
  });
});

describe("decode never throws", () => {
  it("survives hostile values", () => {
    const weird = {
      primaryType: "Permit",
      domain: { name: "X", chainId: 1, verifyingContract: USDC },
      types: {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      message: { owner: ME, spender: 123, value: "1", nonce: "0", deadline: "-1" },
    };
    expect(() =>
      decodeRequest({ method: "eth_signTypedData_v4", params: [ME, JSON.stringify(weird)], chainId: 1, account: ME, tokens: { [USDC.toLowerCase()]: { symbol: "X", decimals: 200 } } })
    ).not.toThrow();
    expect(() => decodeRequest({ method: "eth_sendTransaction", params: [null], chainId: 1, account: ME })).not.toThrow();
    expect(() => decodeRequest({ method: "personal_sign", params: [{}, 5], chainId: 1, account: ME })).not.toThrow();
  });

  it("formats out-of-range token decimals without throwing", () => {
    const erc = new ethers.Interface(["function approve(address,uint256)"]);
    expect(() =>
      decodeRequest({
        method: "eth_sendTransaction",
        params: [{ to: USDC, data: erc.encodeFunctionData("approve", [OTHER, 5n]) }],
        chainId: 1,
        account: ME,
        tokens: { [USDC.toLowerCase()]: { symbol: "USDC", decimals: 200 } },
      })
    ).not.toThrow();
  });
});
