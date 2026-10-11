/**
 * Turns a WalletConnect request into a plain-language summary plus risk flags,
 * so people can see what they're signing before the PIN and card tap.
 *
 * Pure and synchronous: no network. Token symbols/decimals are passed in by
 * the UI (fetched separately); without them amounts fall back to raw units.
 */
import { ethers } from "ethers";
import { parseChainIdParam, parsePersonalSignParams, parseTxParams, parseTypedDataParams, type TxRequest, type TypedDataRequest } from "./params";

export type RiskLevel = "info" | "warn" | "danger";

export interface RiskFlag {
  level: RiskLevel;
  code: string;
  message: string;
}

export interface Fact {
  label: string;
  value: string;
  /** Render as an address the person should check (identicon + full address). */
  address?: string;
  mono?: boolean;
}

export interface TokenMeta {
  symbol: string;
  decimals: number;
}

export type RequestKind = "transaction" | "typed" | "message" | "siwe" | "network" | "unsupported";

export interface DecodedRequest {
  kind: RequestKind;
  /** Plain-language title, e.g. "Approve unlimited USDC". */
  action: string;
  facts: Fact[];
  risks: RiskFlag[];
  /** Token contracts whose symbol/decimals would improve this summary. */
  tokenAddresses: string[];
  /** Full payload for the "View raw data" disclosure. */
  raw: string;
}

export interface DecodeContext {
  method: string;
  params: any[];
  /** Chain the request was made on. */
  chainId: number;
  /** Connected wallet address. */
  account?: string | null;
  /** The dApp's metadata.url (for sign-in domain checks). */
  dappUrl?: string;
  /** Origin confirmed by WalletConnect Verify; preferred over dappUrl. */
  verifiedOrigin?: string;
  dappName?: string;
  nativeSymbol?: string;
  /** Lower-cased token address → metadata. */
  tokens?: Record<string, TokenMeta>;
  chainName?: (chainId: number) => string;
}

// ─── Known contracts ─────────────────────────────────────────────────────────

export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const KNOWN: Record<string, string> = {
  [PERMIT2_ADDRESS.toLowerCase()]: "Permit2 (Uniswap)",
};

export function knownContractName(address?: string | null): string | null {
  return address ? KNOWN[address.toLowerCase()] ?? null : null;
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

const UNLIMITED_256 = 2n ** 255n;
const UNLIMITED_160 = 2n ** 159n;

export function shortAddr(address: unknown): string {
  const a = typeof address === "string" ? address : String(address ?? "");
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function groupThousands(i: string): string {
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Human amount: thousands separators, at most 6 decimals, "< 0.000001" for dust. */
export function formatAmount(value: bigint, decimals: number): string {
  const d = Number.isInteger(decimals) && decimals >= 0 && decimals <= 77 ? decimals : 18;
  const s = ethers.formatUnits(value, d);
  const [int, frac = ""] = s.split(".");
  const f = frac.replace(/0+$/, "").slice(0, 6).replace(/0+$/, "");
  if (value > 0n && int === "0" && !f) return "< 0.000001";
  return f ? `${groupThousands(int)}.${f}` : groupThousands(int);
}

function toBig(v: unknown): bigint | null {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number") return BigInt(Math.trunc(v));
    if (typeof v === "string" && v.trim() !== "") return BigInt(v.trim());
  } catch {
    /* not a number */
  }
  return null;
}

function toChainId(v: unknown): number | null {
  const b = toBig(v);
  return b === null ? null : Number(b);
}

/** Unix seconds → "2026-11-10 14:00 UTC", or "never" for far-future values. */
export function formatDeadline(v: unknown): string {
  const b = toBig(v);
  if (b === null) return "—";
  if (b === 0n) return "—";
  if (b > 32503680000n) return "Never"; // after year 3000
  if (b < 0n) return "—";
  return new Date(Number(b) * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

interface TokenAmount {
  text: string;
  symbol: string;
  unlimited: boolean;
}

function tokenAmount(amount: bigint, token: string | undefined, ctx: DecodeContext, unlimitedAt = UNLIMITED_256): TokenAmount {
  const meta = token ? ctx.tokens?.[token.toLowerCase()] : undefined;
  const unlimited = amount >= unlimitedAt;
  const symbol = meta?.symbol || "tokens";
  if (unlimited) return { text: "Unlimited", symbol, unlimited };
  if (meta) return { text: formatAmount(amount, meta.decimals), symbol, unlimited };
  return { text: `${groupThousands(amount.toString())} raw units`, symbol, unlimited };
}

function addressFact(label: string, address: unknown): Fact {
  if (typeof address !== "string" || !ethers.isAddress(address)) {
    return { label, value: `Invalid address (${shortAddr(address)})` };
  }
  const known = knownContractName(address);
  return { label, value: known ?? shortAddr(address), address };
}

/** A request OpenBurner won't sign: shown with only a Reject button. */
function refused(action: string, message: string, raw: unknown): DecodedRequest {
  return {
    kind: "unsupported",
    action,
    facts: [],
    risks: [{ level: "danger", code: "refused", message }],
    tokenAddresses: [],
    raw: typeof raw === "string" ? raw : safeJson(raw),
  };
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), 2) ?? "";
  } catch {
    return String(v);
  }
}

function chainLabel(ctx: DecodeContext, id: number): string {
  return ctx.chainName ? ctx.chainName(id) : `Chain ${id}`;
}

// ─── Transactions ────────────────────────────────────────────────────────────

const iface = new ethers.Interface([
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amountOrId)",
  "function approve(address spender, uint256 amountOrId)",
  "function increaseAllowance(address spender, uint256 addedValue)",
  "function setApprovalForAll(address operator, bool approved)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes data)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)",
]);

const permit2Iface = new ethers.Interface([
  "function approve(address token, address spender, uint160 amount, uint48 expiration)",
]);

const PERMIT2_APPROVE = permit2Iface.getFunction("approve")!.selector;

function decodeTransaction(ctx: DecodeContext): DecodedRequest {
  let txReq: TxRequest;
  try {
    txReq = parseTxParams(ctx.params);
  } catch (err: any) {
    return refused("Can't read this transaction", err?.message || "This transaction is malformed.", ctx.params);
  }
  const tx = txReq.raw as Record<string, any>;
  const to = txReq.to;
  const data = txReq.data;
  const value = txReq.value;
  const native = ctx.nativeSymbol || "ETH";
  const facts: Fact[] = [];
  const risks: RiskFlag[] = [];
  const tokenAddresses: string[] = [];
  const raw = JSON.stringify(tx, null, 2);
  const hasData = data && data !== "0x" && data.length >= 10;

  if (ctx.account && typeof tx.from === "string" && tx.from.toLowerCase() !== ctx.account.toLowerCase()) {
    risks.push({
      level: "warn",
      code: "from-mismatch",
      message: `This transaction names a different sender (${shortAddr(tx.from)}) than your wallet.`,
    });
  }

  const valueRisk = () => {
    if (value > 0n) {
      risks.push({
        level: "warn",
        code: "value-to-contract",
        message: `This also sends ${formatAmount(value, 18)} ${native} to the contract.`,
      });
      facts.push({ label: "Also sends", value: `${formatAmount(value, 18)} ${native}` });
    }
  };

  // Contract deployment
  if (!to) {
    if (value > 0n) facts.push({ label: "Value", value: `${formatAmount(value, 18)} ${native}` });
    risks.push({ level: "warn", code: "deploy", message: "Deploys new contract code from your wallet." });
    return { kind: "transaction", action: "Deploy a contract", facts, risks, tokenAddresses, raw };
  }

  // Plain native transfer
  if (!hasData) {
    facts.push(addressFact("To", to));
    facts.push({ label: "Amount", value: `${formatAmount(value, 18)} ${native}` });
    return {
      kind: "transaction",
      action: `Send ${formatAmount(value, 18)} ${native}`,
      facts,
      risks,
      tokenAddresses,
      raw,
    };
  }

  const selector = data.slice(0, 10).toLowerCase();

  // Permit2 allowance (on the Permit2 contract itself)
  if (selector === PERMIT2_APPROVE) {
    try {
      const [token, spender, amount, expiration] = permit2Iface.decodeFunctionData("approve", data);
      tokenAddresses.push(token);
      const amt = tokenAmount(amount, token, ctx, UNLIMITED_160);
      facts.push(addressFact("Spender", spender));
      facts.push(addressFact("Token", token));
      facts.push({ label: "Amount", value: amt.unlimited ? `Unlimited ${amt.symbol}` : `${amt.text} ${amt.symbol}` });
      facts.push({ label: "Expires", value: formatDeadline(expiration) });
      risks.push(
        amt.unlimited
          ? { level: "warn", code: "unlimited", message: `Unlimited approval: ${shortAddr(spender)} can spend all of your ${amt.symbol} through Permit2 until it expires or you revoke it.` }
          : { level: "info", code: "permit2", message: `Lets ${shortAddr(spender)} spend up to ${amt.text} ${amt.symbol} through Permit2.` }
      );
      valueRisk();
      return {
        kind: "transaction",
        action: amt.unlimited ? `Approve unlimited ${amt.symbol}` : `Approve ${amt.text} ${amt.symbol}`,
        facts,
        risks,
        tokenAddresses,
        raw,
      };
    } catch {
      /* fall through to unknown */
    }
  }

  let parsed: ethers.TransactionDescription | null = null;
  try {
    parsed = iface.parseTransaction({ data, value });
  } catch {
    parsed = null;
  }

  if (parsed) {
    const meta = ctx.tokens?.[to.toLowerCase()];
    const name = parsed.name;
    const sig = parsed.signature;

    if (name === "transfer") {
      tokenAddresses.push(to);
      const [recipient, amount] = parsed.args as unknown as [string, bigint];
      const amt = tokenAmount(amount, to, ctx, 2n ** 512n); // a transfer is never "unlimited"
      facts.push(addressFact("To", recipient));
      facts.push({ label: "Amount", value: `${amt.text} ${amt.symbol}` });
      facts.push(addressFact("Token", to));
      valueRisk();
      return { kind: "transaction", action: meta ? `Send ${amt.text} ${amt.symbol}` : "Send tokens", facts, risks, tokenAddresses, raw };
    }

    if (name === "approve" || name === "increaseAllowance") {
      tokenAddresses.push(to);
      const [spender, amount] = parsed.args as unknown as [string, bigint];
      facts.push(addressFact("Spender", spender));
      facts.push(addressFact("Token", to));
      // ERC-721 approve(to, tokenId) shares this selector; without ERC-20 decimals
      // a small number is probably an NFT id.
      if (name === "approve" && !meta && amount > 0n && amount < UNLIMITED_256) {
        facts.push({ label: "Amount or token ID", value: groupThousands(amount.toString()) });
        risks.push({
          level: "info",
          code: "approve-unknown",
          message: `Lets ${shortAddr(spender)} move this token (or an amount of it) from your wallet.`,
        });
        valueRisk();
        return { kind: "transaction", action: "Approve token access", facts, risks, tokenAddresses, raw };
      }
      if (name === "approve" && amount === 0n) {
        risks.push({
          level: "info",
          code: "revoke",
          message: `Removes ${shortAddr(spender)}'s permission to spend your ${meta?.symbol || "tokens"}.`,
        });
        facts.push({ label: "Amount", value: "0 (revoke)" });
        valueRisk();
        return { kind: "transaction", action: `Revoke ${meta?.symbol || "token"} approval`, facts, risks, tokenAddresses, raw };
      }
      const amt = tokenAmount(amount, to, ctx);
      facts.push({ label: name === "increaseAllowance" ? "Add to allowance" : "Amount", value: `${amt.text} ${amt.symbol}` });
      if (amt.unlimited) {
        risks.push({
          level: "warn",
          code: "unlimited",
          message: `Unlimited approval: ${shortAddr(spender)} can spend all of your ${amt.symbol}, now and later, until you revoke it.`,
        });
      }
      valueRisk();
      const verb = name === "increaseAllowance" ? "Allow" : "Approve";
      return {
        kind: "transaction",
        action: amt.unlimited ? `${verb} unlimited ${amt.symbol}` : `${verb} ${amt.text} ${amt.symbol}`,
        facts,
        risks,
        tokenAddresses,
        raw,
      };
    }

    if (name === "setApprovalForAll") {
      const [operator, approved] = parsed.args as unknown as [string, boolean];
      facts.push(addressFact("Operator", operator));
      facts.push(addressFact("Collection", to));
      if (approved) {
        risks.push({
          level: "danger",
          code: "approval-for-all",
          message: `${knownContractName(operator) ?? shortAddr(operator)} could move every NFT you own in this collection, without asking again.`,
        });
      } else {
        risks.push({ level: "info", code: "revoke", message: `Removes ${shortAddr(operator)}'s access to this collection.` });
      }
      valueRisk();
      return {
        kind: "transaction",
        action: approved ? "Give access to all your NFTs in a collection" : "Revoke collection access",
        facts,
        risks,
        tokenAddresses,
        raw,
      };
    }

    if (name === "transferFrom") {
      tokenAddresses.push(to);
      const [from, recipient, amountOrId] = parsed.args as unknown as [string, string, bigint];
      facts.push(addressFact("From", from));
      facts.push(addressFact("To", recipient));
      facts.push(addressFact(meta ? "Token" : "Contract", to));
      if (meta) {
        const amt = tokenAmount(amountOrId, to, ctx);
        facts.push({ label: "Amount", value: `${amt.text} ${amt.symbol}` });
        valueRisk();
        return { kind: "transaction", action: `Move ${amt.text} ${amt.symbol}`, facts, risks, tokenAddresses, raw };
      }
      facts.push({ label: "Token ID", value: `#${amountOrId.toString()}` });
      valueRisk();
      return { kind: "transaction", action: `Transfer NFT #${shortId(amountOrId)}`, facts, risks, tokenAddresses, raw };
    }

    if (name === "safeTransferFrom" || name === "safeBatchTransferFrom") {
      const args = parsed.args as unknown as any[];
      const [from, recipient] = args as [string, string];
      facts.push(addressFact("From", from));
      facts.push(addressFact("To", recipient));
      facts.push(addressFact("Collection", to));
      if (sig.startsWith("safeBatchTransferFrom")) {
        const ids = (args[2] as bigint[]).map((i) => `#${shortId(i)}`).join(", ");
        facts.push({ label: "Token IDs", value: ids || "—" });
        valueRisk();
        return { kind: "transaction", action: `Transfer ${(args[2] as bigint[]).length} NFTs`, facts, risks, tokenAddresses, raw };
      }
      const id = args[2] as bigint;
      facts.push({ label: "Token ID", value: `#${id.toString()}` });
      if (args.length === 5) facts.push({ label: "Quantity", value: (args[3] as bigint).toString() });
      valueRisk();
      return { kind: "transaction", action: `Transfer NFT #${shortId(id)}`, facts, risks, tokenAddresses, raw };
    }
  }

  // Unknown contract call
  facts.push(addressFact("Contract", to));
  facts.push({ label: "Function", value: selector, mono: true });
  risks.push({
    level: "info",
    code: "unknown-call",
    message: `OpenBurner can't read this contract call. Only approve it if you trust ${ctx.dappName || "this dApp"}.`,
  });
  valueRisk();
  return { kind: "transaction", action: "Contract interaction", facts, risks, tokenAddresses, raw };
}

function shortId(id: bigint): string {
  const s = id.toString();
  return s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s;
}

// ─── Typed data (EIP-712) ────────────────────────────────────────────────────

const MARKETPLACE_DOMAIN = /seaport|blur|looksrare|x2y2|opensea|rarible|magic ?eden|element|zora/i;
const MARKETPLACE_TYPES = new Set(["OrderComponents", "Order", "MakerOrder", "Maker", "BulkOrder"]);

function decodeTypedData(ctx: DecodeContext): DecodedRequest {
  let parsed: TypedDataRequest;
  try {
    parsed = parseTypedDataParams(ctx.params, ctx.account);
  } catch (err: any) {
    return refused("Can't read this signature request", err?.message || "This signature request is malformed.", ctx.params);
  }
  const json = parsed.json;
  const raw = safeJson(json);
  const facts: Fact[] = [];
  const risks: RiskFlag[] = [];
  const tokenAddresses: string[] = [];

  const domain: Record<string, any> = parsed.domain || {};
  const message: Record<string, any> = parsed.message || {};
  // Derived from `types` exactly as the signature hash is, never taken on trust.
  const primaryType: string = parsed.primaryType;
  const domainName: string = String(domain.name || "");
  const domainChain = toChainId(domain.chainId);
  const verifyingContract: string | undefined = typeof domain.verifyingContract === "string" ? domain.verifyingContract : undefined;

  const commonRisks = () => {
    if (domainChain !== null && domainChain !== ctx.chainId) {
      risks.push({
        level: "warn",
        code: "chain-mismatch",
        message: `This signature is for ${chainLabel(ctx, domainChain)}, but the request came in on ${chainLabel(ctx, ctx.chainId)}.`,
      });
    }
    if (!verifyingContract) {
      risks.push({
        level: "warn",
        code: "no-contract",
        message: "This signature doesn't name a contract, so it's unclear where it can be used.",
      });
    }
  };

  const isPermit2 = /permit2/i.test(domainName) || (verifyingContract?.toLowerCase() === PERMIT2_ADDRESS.toLowerCase());

  // Permit2: PermitSingle / PermitBatch / PermitTransferFrom (+ witness / batch variants)
  if (isPermit2 && /^Permit/.test(primaryType)) {
    const spender: string | undefined = message.spender;
    let entries: Array<{ token: string; amount: bigint; expiration?: unknown }> = [];
    if (primaryType === "PermitSingle" && message.details) {
      entries = [{ token: message.details.token, amount: toBig(message.details.amount) ?? 0n, expiration: message.details.expiration }];
    } else if (primaryType === "PermitBatch" && Array.isArray(message.details)) {
      entries = message.details.map((d: any) => ({ token: d.token, amount: toBig(d.amount) ?? 0n, expiration: d.expiration }));
    } else if (message.permitted) {
      const permitted = Array.isArray(message.permitted) ? message.permitted : [message.permitted];
      entries = permitted.map((p: any) => ({ token: p.token, amount: toBig(p.amount) ?? 0n }));
    }
    entries = entries.filter((e) => typeof e.token === "string");
    const isTransfer = /TransferFrom/.test(primaryType);
    if (spender) facts.push(addressFact("Spender", spender));
    let anyUnlimited = false;
    const labels: string[] = [];
    for (const e of entries) {
      tokenAddresses.push(e.token);
      const amt = tokenAmount(e.amount, e.token, ctx, UNLIMITED_160);
      anyUnlimited ||= amt.unlimited;
      labels.push(amt.unlimited ? `unlimited ${amt.symbol}` : `${amt.text} ${amt.symbol}`);
      facts.push({ label: entries.length > 1 ? `Token (${amt.symbol})` : "Token", value: knownContractName(e.token) ?? shortAddr(e.token), address: e.token });
      facts.push({ label: "Amount", value: amt.unlimited ? `Unlimited ${amt.symbol}` : `${amt.text} ${amt.symbol}` });
      if (e.expiration !== undefined) facts.push({ label: "Allowance expires", value: formatDeadline(e.expiration) });
    }
    const deadline = message.sigDeadline ?? message.deadline;
    if (deadline !== undefined) facts.push({ label: "Signature valid until", value: formatDeadline(deadline) });
    risks.push({
      level: "warn",
      code: anyUnlimited ? "unlimited" : "permit",
      message: anyUnlimited
        ? `Unlimited approval: ${spender ? shortAddr(spender) : "the spender"} can spend all of these tokens without another confirmation.`
        : `Signing lets ${spender ? shortAddr(spender) : "the spender"} ${isTransfer ? "take" : "spend"} these tokens without another confirmation.`,
    });
    commonRisks();
    const what = labels.length === 1 ? labels[0] : `${labels.length} tokens`;
    return {
      kind: "typed",
      action: isTransfer ? `Allow transfer of ${what}` : `Approve ${what}`,
      facts,
      risks,
      tokenAddresses,
      raw,
    };
  }

  // EIP-2612 Permit (and DAI-style permit with `allowed`)
  if (primaryType === "Permit" && message.spender) {
    const token = verifyingContract;
    if (token) tokenAddresses.push(token);
    const spender: string = message.spender;
    facts.push(addressFact("Spender", spender));
    if (token) facts.push(addressFact("Token", token));
    let amt: TokenAmount;
    if (typeof message.allowed === "boolean" || message.allowed === "true" || message.allowed === "false") {
      const allowed = message.allowed === true || message.allowed === "true";
      const sym = (token && ctx.tokens?.[token.toLowerCase()]?.symbol) || domainName || "tokens";
      amt = allowed ? { text: "Unlimited", symbol: sym, unlimited: true } : { text: "0", symbol: sym, unlimited: false };
    } else {
      amt = tokenAmount(toBig(message.value) ?? 0n, token, ctx);
      if (amt.symbol === "tokens" && domainName) amt = { ...amt, symbol: domainName };
    }
    facts.push({ label: "Amount", value: amt.unlimited ? `Unlimited ${amt.symbol}` : `${amt.text} ${amt.symbol}` });
    const deadline = message.deadline ?? message.expiry;
    if (deadline !== undefined) facts.push({ label: "Valid until", value: formatDeadline(deadline) });
    risks.push({
      level: "warn",
      code: amt.unlimited ? "unlimited" : "permit",
      message: amt.unlimited
        ? `Unlimited approval: ${shortAddr(spender)} can spend all of your ${amt.symbol} without another confirmation.`
        : `Signing lets ${shortAddr(spender)} spend ${amt.text} ${amt.symbol} without another confirmation.`,
    });
    commonRisks();
    return {
      kind: "typed",
      action: amt.unlimited ? `Approve unlimited ${amt.symbol}` : `Approve ${amt.text} ${amt.symbol}`,
      facts,
      risks,
      tokenAddresses,
      raw,
    };
  }

  // Marketplace orders (Seaport, Blur, LooksRare…)
  if (MARKETPLACE_DOMAIN.test(domainName) || MARKETPLACE_TYPES.has(primaryType)) {
    if (domainName) facts.push({ label: "Marketplace", value: domainName });
    if (primaryType) facts.push({ label: "Type", value: primaryType });
    if (verifyingContract) facts.push(addressFact("Contract", verifyingContract));
    risks.push({
      level: "danger",
      code: "marketplace-order",
      message: "This is a marketplace order. Signing it can let someone take your NFTs or tokens at the price in the order.",
    });
    commonRisks();
    return { kind: "typed", action: `${domainName || "Marketplace"} listing or order`, facts, risks, tokenAddresses, raw };
  }

  // Anything else
  if (domainName) facts.push({ label: "App", value: domainName });
  if (primaryType) facts.push({ label: "Type", value: primaryType });
  if (verifyingContract) facts.push(addressFact("Contract", verifyingContract));
  commonRisks();
  return {
    kind: "typed",
    action: domainName ? `Sign ${primaryType || "data"} for ${domainName}` : "Sign structured data",
    facts,
    risks,
    tokenAddresses,
    raw,
  };
}

// ─── personal_sign / SIWE ────────────────────────────────────────────────────

export interface SiweMessage {
  scheme?: string;
  domain: string;
  address: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: number;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
}

/** Parse an EIP-4361 Sign-In with Ethereum message, or null if it isn't one. */
export function parseSiwe(text: string): SiweMessage | null {
  const header = text.match(/^(?:([a-zA-Z][a-zA-Z0-9+.-]*):\/\/)?(\S+) wants you to sign in with your Ethereum account:\r?\n(0x[a-fA-F0-9]{40})/);
  if (!header) return null;
  const field = (name: string) => text.match(new RegExp(`^${name}: (.+)$`, "m"))?.[1]?.trim();
  const lines = text.split(/\r?\n/);
  // Statement: the line after the blank line that follows the address, unless it's a field.
  let statement: string | undefined;
  if (lines[2] === "" && lines[3] && !/^[A-Z][A-Za-z ]+: /.test(lines[3])) statement = lines[3];
  const chain = field("Chain ID");
  return {
    scheme: header[1],
    domain: header[2],
    address: header[3],
    statement,
    uri: field("URI"),
    version: field("Version"),
    chainId: chain ? Number(chain) : undefined,
    nonce: field("Nonce"),
    issuedAt: field("Issued At"),
    expirationTime: field("Expiration Time"),
  };
}

function hostOf(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).host.toLowerCase();
  } catch {
    return null;
  }
}

function sameHost(a: string, b: string): boolean {
  const norm = (h: string) => h.toLowerCase().replace(/^www\./, "");
  return norm(a) === norm(b);
}

/** Decode a personal_sign payload: text when it's valid UTF-8, otherwise null. */
export function decodeMessageText(payload: string): { text: string | null; hex: string } {
  if (typeof payload !== "string") return { text: null, hex: "" };
  if (!ethers.isHexString(payload)) return { text: payload, hex: ethers.hexlify(ethers.toUtf8Bytes(payload)) };
  try {
    const bytes = ethers.getBytes(payload);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // Control characters (other than whitespace) mean it isn't really text.
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) return { text: null, hex: payload };
    return { text, hex: payload };
  } catch {
    return { text: null, hex: payload };
  }
}

function decodePersonalSign(ctx: DecodeContext): DecodedRequest {
  let message: string;
  try {
    message = parsePersonalSignParams(ctx.params, ctx.account);
  } catch (err: any) {
    return refused("Can't read this message", err?.message || "This sign request is malformed.", ctx.params);
  }
  const { text, hex } = decodeMessageText(message);
  const facts: Fact[] = [];
  const risks: RiskFlag[] = [];

  if (text === null) {
    risks.push({
      level: "warn",
      code: "unreadable",
      message: `This message isn't readable text. Only sign it if you trust ${ctx.dappName || "this dApp"}.`,
    });
    return { kind: "message", action: "Sign a message", facts, risks, tokenAddresses: [], raw: hex };
  }

  const siwe = parseSiwe(text);
  if (siwe) {
    const host = hostOf(ctx.verifiedOrigin) ?? hostOf(ctx.dappUrl);
    facts.push({ label: "Website", value: siwe.domain });
    facts.push(addressFact("Account", siwe.address));
    if (siwe.chainId !== undefined) facts.push({ label: "Network", value: chainLabel(ctx, siwe.chainId) });
    if (siwe.issuedAt) facts.push({ label: "Issued", value: siwe.issuedAt });
    if (siwe.expirationTime) facts.push({ label: "Expires", value: siwe.expirationTime });
    if (siwe.nonce) facts.push({ label: "Nonce", value: siwe.nonce, mono: true });
    if (!host) {
      risks.push({
        level: "warn",
        code: "siwe-no-origin",
        message: `The dApp didn't share its website, so OpenBurner can't check that this sign-in is for ${siwe.domain}.`,
      });
    } else if (!sameHost(siwe.domain, host)) {
      risks.push({
        level: "danger",
        code: "siwe-domain-mismatch",
        message: `This sign-in is for ${siwe.domain}, but the request came from ${host}. It could be a phishing site.`,
      });
    }
    if (ctx.account && siwe.address.toLowerCase() !== ctx.account.toLowerCase()) {
      risks.push({
        level: "danger",
        code: "siwe-address-mismatch",
        message: `This sign-in names a different wallet (${shortAddr(siwe.address)}) than yours.`,
      });
    }
    return { kind: "siwe", action: `Sign in to ${siwe.domain}`, facts, risks, tokenAddresses: [], raw: text };
  }

  return { kind: "message", action: "Sign a message", facts, risks, tokenAddresses: [], raw: text };
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function decodeRequest(ctx: DecodeContext): DecodedRequest {
  try {
    return decodeUnsafe(ctx);
  } catch {
    // A request we can't even describe is one we won't sign.
    return refused("Can't read this request", "This request couldn't be read, so OpenBurner won't sign it.", ctx.params);
  }
}

function decodeUnsafe(ctx: DecodeContext): DecodedRequest {
  const { method, params } = ctx;
  switch (method) {
    case "eth_sendTransaction":
    case "eth_signTransaction":
      return decodeTransaction(ctx);
    case "eth_signTypedData":
    case "eth_signTypedData_v3":
    case "eth_signTypedData_v4":
      return decodeTypedData(ctx);
    case "personal_sign":
      return decodePersonalSign(ctx);
    case "eth_sign":
      return {
        kind: "unsupported",
        action: "Blind signature",
        facts: [],
        risks: [
          {
            level: "danger",
            code: "eth-sign",
            message: "Blind signing can authorize almost anything, so OpenBurner doesn't support it.",
          },
        ],
        tokenAddresses: [],
        raw: JSON.stringify(params, null, 2),
      };
    case "wallet_switchEthereumChain": {
      let target: number;
      try {
        target = parseChainIdParam(params?.[0]?.chainId);
      } catch (err: any) {
        return refused("Can't read this network request", err?.message || "Invalid chain id.", params);
      }
      return {
        kind: "network",
        action: `Switch to ${chainLabel(ctx, target)}`,
        facts: [{ label: "Network", value: chainLabel(ctx, target) }],
        risks: [],
        tokenAddresses: [],
        raw: JSON.stringify(params, null, 2),
      };
    }
    case "wallet_addEthereumChain": {
      const p = params?.[0] || {};
      let id: number | null = null;
      try {
        id = parseChainIdParam(p.chainId);
      } catch (err: any) {
        return refused("Can't read this network request", err?.message || "Invalid chain id.", params);
      }
      const facts: Fact[] = [{ label: "Network", value: p.chainName || "—" }];
      if (id !== null) facts.push({ label: "Chain ID", value: String(id), mono: true });
      facts.push({ label: "RPC", value: (p.rpcUrls || [])[0] || "—", mono: true });
      return {
        kind: "network",
        action: `Add ${p.chainName || "a network"}`,
        facts,
        risks: [
          {
            level: "info",
            code: "add-chain",
            message: "Only add networks from sites you trust. The RPC sees your address and balances.",
          },
        ],
        tokenAddresses: [],
        raw: JSON.stringify(params, null, 2),
      };
    }
    default:
      return {
        kind: "unsupported",
        action: method,
        facts: [],
        risks: [],
        tokenAddresses: [],
        raw: JSON.stringify(params, null, 2),
      };
  }
}

// ─── WalletConnect Verify API ────────────────────────────────────────────────

export type VerifyStatus = "verified" | "unverified" | "mismatch" | "scam" | "none";

/**
 * Reads WalletKit's verifyContext ({ verified: { origin, validation, isScam } }).
 * "none" when the SDK provided nothing.
 */
export function verifyStatus(verifyContext: any): { status: VerifyStatus; origin?: string } {
  const v = verifyContext?.verified;
  if (!v) return { status: "none" };
  const origin = typeof v.origin === "string" ? v.origin : undefined;
  if (v.isScam) return { status: "scam", origin };
  if (v.validation === "VALID") return { status: "verified", origin };
  if (v.validation === "INVALID") return { status: "mismatch", origin };
  return { status: "unverified", origin };
}

/** Highest risk level present (scam/mismatch from Verify count as danger). */
export function hasDanger(decoded: DecodedRequest, verify: VerifyStatus): boolean {
  return verify === "scam" || verify === "mismatch" || decoded.risks.some((r) => r.level === "danger");
}
