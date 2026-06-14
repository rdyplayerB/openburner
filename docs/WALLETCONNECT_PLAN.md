# WalletConnect (dApp) Support — Implementation Plan

> Status: **Plan / spec only — not yet implemented.**
> Goal: Let an OpenBurner user connect to external dApps (Uniswap, OpenSea, etc.) by
> scanning a WalletConnect QR code or pasting a `wc:` URI, approve a session, and sign
> the dApp's requests with their Burner hardware card.

## Decisions (locked)

1. **`eth_sign` (blind signing): rejected.** Not offered.
2. **Cross-chain requests: auto-switch.** Silent switch for chains in our serve-set;
   unknown chains degrade into the `addEthereumChain` / custom-RPC flow (see
   "Chain switching & unknown chains").
3. **Entry points: both** (dashboard header scan icon **and** hamburger/menu), with an
   intuitive nav that surfaces connect, active sessions, and incoming requests.
4. **SIWE `auth_request`: deferred** (not in v1).
5. **UI: build in the current UI now.** Chosen design direction is **Swiss Editorial** —
   Liquid Glass is dropped. WalletConnect ships in the current UI and is restyled to Swiss
   as part of the broader redesign.

---

## 1. Scope

**In scope (v1)**
- Pair with a dApp via QR scan (mobile) or pasted `wc:` URI (desktop).
- Approve / reject session proposals scoped to OpenBurner's supported chains.
- Active-sessions list with disconnect.
- Handle the core request methods: `eth_sendTransaction`, `personal_sign`,
  `eth_signTypedData[_v4]`, `wallet_switchEthereumChain`.
- Route all signing through the existing Burner signer (bridge / gateway / mobile NFC),
  with per-request PIN + physical tap.

**Out of scope (v1, revisit later)**
- WalletConnect `auth_request` / Sign-In-With-Ethereum (SIWE) one-click auth.
- `eth_sign` (blind signing) — recommend rejecting/hiding by default.
- `wallet_addEthereumChain` auto-add (can map to existing custom-RPC flow later).
- Multi-account selection (Burner is a single address per key slot).

---

## 2. How it fits the existing architecture

| Existing piece | Reuse for WalletConnect |
|---|---|
| `lib/smart-signer.ts` (routes bridge/gateway/mobile) | Extend with message + typed-data signing |
| `lib/burner.ts` / `burner-gateway.ts` / `mobile/nfc.ts` | Already sign a **digest** via libhalo `sign` — refactor to expose `signDigestWith*` |
| `components/pin-input.tsx` | PIN entry for each WC signing request |
| `store/wallet-store.ts` (address, chainId, rpcUrl, keySlot, connectionMode) | Source of signer identity + active chain |
| `lib/supported-chains.ts` + chain/RPC maps | Build approved CAIP-2 namespaces; pick RPC per request chain |
| Modal pattern (`modal-overlay` + backdrop) | WC connect / proposal / request sheets |
| Env-key pattern (CoinGecko/0x/Alchemy) | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` |

**Key enabler:** `signTransactionWithBurner` already signs `tx.unsignedHash` by sending
`{ name:"sign", keyNo, digest, password }` to the bridge and assembling `{r,s,v}`.
Message signing is the *same primitive on a different digest*, so it reuses all three
connection-mode signers with minimal new code.

---

## 3. Dependencies & config

```
npm i @reown/walletkit @walletconnect/core @walletconnect/utils
npm i @zxing/browser            # QR scanning from camera (mobile)
```

- **WalletKit** = the wallet-side SDK (successor to `@walletconnect/web3wallet`).
- **Project ID**: free from https://cloud.reown.com. WC project IDs are safe to expose
  client-side, so use `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (add to `env.example`).
- `@zxing/browser` decodes a `wc:` URI from the device camera; desktop uses paste.

---

## 4. New & modified files

**New**
- `lib/walletconnect/client.ts` — WalletKit singleton: `initWalletKit()`, `pair(uri)`,
  `approveProposal`, `rejectProposal`, `respondRequest`, `disconnectSession`,
  `getActiveSessions()`, and event subscription wiring.
- `lib/walletconnect/namespaces.ts` — build `eip155` approved namespaces (CAIP-2) from
  `supported-chains` + the Burner address; CAIP helpers (`eip155:1:0x…`).
- `lib/walletconnect/request-handlers.ts` — `method → handler` map returning a JSON-RPC
  result/error; calls the signer + broadcasts where needed.
- `lib/sign-message.ts` — `signMessageSmart`, `signTypedDataSmart`, low-level
  `signDigestSmart` (mode-aware; mirrors `signTransactionSmart`).
- `store/walletconnect-store.ts` — zustand store (sessions, pending proposal, pending
  request, init/ pair / approve / reject / respond / disconnect).
- `components/walletconnect/wc-provider.tsx` — mounts once (in dashboard); inits WalletKit
  on load if connected, registers listeners, renders proposal/request modals globally.
- `components/walletconnect/wc-connect-modal.tsx` — scan (camera) / paste URI entry.
- `components/walletconnect/wc-session-proposal.tsx` — approval screen.
- `components/walletconnect/wc-request-modal.tsx` — per-request signing sheet.
- `components/walletconnect/wc-sessions-list.tsx` — active dApps + disconnect.

**Modified**
- `lib/burner.ts`, `lib/burner-gateway.ts`, `lib/mobile/nfc.ts` — extract
  `signDigestWith{Burner,Gateway,MobileNFC}(digest, keySlot, pin)`; have the existing
  transaction signers call it (no behavior change), and reuse for messages.
- `lib/smart-signer.ts` — add `signDigestSmart` (and thin `signMessageSmart` /
  `signTypedDataSmart`) using the same mode-detection logic.
- `components/shared/wallet-dashboard.tsx` — mount `<WcProvider/>`; add a "Connect to dApp"
  entry (header scan icon and/or hamburger item).
- `env.example`, `README.md`, this doc.

---

## 5. Signer additions (the core technical detail)

Refactor each mode's signer to a low-level digest signer, then derive everything:

```ts
// personal_sign: param is hex-encoded message
const digest = ethers.hashMessage(ethers.getBytes(messageHex));      // EIP-191
const sig = await signDigestSmart(digest, keySlot, pin, env);        // {r,s,v} -> 65-byte hex

// eth_signTypedData_v4
const { EIP712Domain, ...types } = parsed.types;
const digest = ethers.TypedDataEncoder.hash(parsed.domain, types, parsed.message);
const sig = await signDigestSmart(digest, keySlot, pin, env);
```

- `signDigestSmart` reuses `smart-signer`'s bridge/gateway/mobile branching; sends the
  digest to libhalo `sign` and assembles `ethers.Signature.from({r,s,v}).serialized`.
- **Normalize `v` to 27/28** for message/typed-data signatures (transactions let ethers
  recompute `yParity`). Validate libhalo's returned `v` and adjust if it returns 0/1.
- **Acceptance test:** `ethers.verifyMessage(msg, sig) === address` and
  `ethers.verifyTypedData(domain, types, value, sig) === address`.

---

## 6. Request-handling matrix

| Method | Handling |
|---|---|
| `eth_sendTransaction` | Build `TransactionRequest` from params; fill nonce/fees/gas (reuse `send-token` logic incl. Base legacy branch); `signTransactionSmart`; **broadcast** via that chain's RPC; respond with tx hash. |
| `personal_sign` | `signMessageSmart(message)`; respond with signature. |
| `eth_signTypedData` / `_v3` / `_v4` | Parse JSON; `signTypedDataSmart`; respond with signature. |
| `wallet_switchEthereumChain` | In serve-set → `setChain(...)`, emit `chainChanged`, respond `null`. Unknown chain → respond `4902` (see next section). |
| `wallet_addEthereumChain` | Show "Add network" confirm (pre-filled from dApp params); validate RPC chainId; save via existing `customRPCs`; switch; respond `null`. |
| `eth_sign` | **Rejected** (blind signing). Not offered. |
| `eth_accounts` / `eth_chainId` | Respond from `wallet-store` (usually covered by namespace). |

Every signing request shows the request sheet → PIN → tap. Signing is already serialized
by `smart-signer`'s `ongoingSigning` guard, so concurrent dApp requests queue safely.

---

## 6.1 Chain switching & unknown chains (decision #2: auto-switch)

**Serve-set = the only chains we ever approve.** When approving a session we scope its
`eip155` namespaces to `{ default supported chains (built-in RPCs) ∪ user-saved custom RPCs }`
via `buildApprovedNamespaces`. Therefore **every chain inside an approved session has a
working RPC** — signing requests never arrive for a chain we can't serve.

Resolution order:

1. **Signing request (`eth_sendTransaction` / `*sign*`) on an approved chain ≠ active chain**
   → **auto-switch silently**: `setChain(...)`, build the provider from that chain's RPC
   (built-in or saved custom), show the network on the request sheet, then sign/broadcast.
   No extra prompt (we always have the RPC).

2. **`wallet_switchEthereumChain` → chain in serve-set** → switch, respond `null`.

3. **`wallet_switchEthereumChain` → chain NOT in serve-set (no RPC)** → we can't reach it.
   Respond **EIP-3326 `4902` "Unrecognized chain ID."** A compliant dApp then follows up
   with `wallet_addEthereumChain`.

4. **`wallet_addEthereumChain` { chainId, chainName, rpcUrls, nativeCurrency,
   blockExplorerUrls }** →
   - Show an **"Add network" confirmation**, pre-filled from the dApp's params and marked
     "provided by &lt;dApp&gt;".
   - On approve, **validate**: connect to the provided RPC, call `eth_chainId`, confirm it
     equals the claimed `chainId` (guards spoofed RPCs).
   - Save via the **existing `customRPCs` mechanism** (same localStorage + `setChain` the
     Network selector uses), switch active chain, respond `null`.
   - Decline / validation failure → respond `4001` (user rejected) + friendly toast.

5. **Bare switch to unknown chain with no add-params provided** → respond `4902` and show a
   non-blocking note: *"&lt;dApp&gt; wants to use chain &lt;id&gt;, which isn't configured.
   Add an RPC under Network → Custom RPC to continue."* User can add it manually and retry.

**Security:** dApp-provided RPCs are third-party — always validate the chainId match and
display the RPC host; never auto-trust.

---

## 7. Session lifecycle & events

```
const core = new Core({ projectId });
const walletKit = await WalletKit.init({ core, metadata: {
  name: 'OpenBurner', description: 'Burner hardware wallet',
  url: 'https://openburner.xyz', icons: ['https://openburner.xyz/icon.png'] }});

walletKit.on('session_proposal', onProposal);   // build namespaces -> approve/reject
walletKit.on('session_request',  onRequest);    // route via handler -> respondSessionRequest
walletKit.on('session_delete',   onDelete);     // drop from store
await walletKit.pair({ uri });                   // from QR / paste
```

- Namespaces via `buildApprovedNamespaces({ proposal, supportedNamespaces })` — throws if a
  *required* chain/method is unsupported → reject with `getSdkError('UNSUPPORTED_CHAINS')`
  and a clear message.
- **Persistence:** WalletKit persists pairings/sessions itself. On app load, if the wallet
  is connected, `WcProvider` re-inits WalletKit and re-registers listeners so existing
  dApp sessions survive refresh.

---

## 8. UI / navigation (decision #3: both entry points, intuitive)

Goal: connecting to a dApp, seeing what's connected, and responding to requests should
each be obvious and never trap the user.

- **Discover / connect (two entries):**
  - **Dashboard header** — a QR/scan icon beside the network pill + menu (primary, most
    discoverable affordance for "connect to a dApp"). Shows a small **badge** with the
    active-session count.
  - **Hamburger menu** — "Connect to dApp" item, plus "Connected dApps (n)" → sessions list.
- **Connect modal:** tabbed — **Scan** (camera; mobile/https) and **Paste URI** (desktop
  default). Auto-pick the default tab via `useEnvironment()`.
- **Proposal sheet:** dApp icon/name/url, requested chains & permissions, Approve / Reject.
- **Request sheet (global):** rendered by `WcProvider` so an incoming request surfaces over
  any tab. Method-specific rendering —
  - tx: to / value / decoded-or-raw data / network / estimated fee;
  - `personal_sign`: decoded UTF-8 message;
  - typed data: domain + primary type + fields;
  then PIN + "Tap Burner to Sign".
- **Connected dApps (manage):** a sessions list reachable from **both** the menu and a
  Settings → "Connected dApps" section; per-dApp icon, chains, disconnect.
- **Styling:** ships in current UI; restyled to **Swiss Editorial** with the broader
  redesign (hairline session rows, uppercase section labels, Geist Mono for addresses /
  chain IDs, single orange accent for the primary action).

---

## 9. Mode / device considerations

- WalletKit runs fully client-side → works in local & hosted.
- Signing routes through `smart-signer` → same bridge / gateway / mobile-NFC + PIN + tap
  flow as a normal send; no new hardware path.
- Camera scan requires https (hosted) or `localhost` (dev); desktop USB-reader mode relies
  on paste. Detect via `useEnvironment()` to choose the default tab.
- A request may target a chain different from the active one: use that chain's RPC
  (supported-chains map or saved custom RPC) to build/broadcast; optionally prompt to switch
  the UI's active chain.

---

## 10. Security

- Show dApp origin/metadata prominently; never sign blind — always render what's being signed.
- Decode `personal_sign` hex to UTF-8; show typed-data domain + primaryType.
- For transactions: estimate gas, show to/value/data + network.
- Per-request PIN + physical Burner tap; no session-level auto-approve.
- Scope sessions strictly to supported chains; reject unsupported.
- Reject all requests when no wallet is connected.

---

## 11. Edge cases

- Expired/invalid pairing URI → toast error.
- Proposal needs an unsupported required chain → reject with reason.
- Card removed / wrong PIN mid-request → respond JSON-RPC error to dApp, keep session.
- Multiple rapid requests → queued by existing signing guard.
- App refresh with live sessions → re-init + restore listeners.
- Relay disconnect/offline → WalletKit auto-reconnect; surface a subtle status if needed.

---

## 12. Phases

1. **Foundation** — deps, Project ID, `client.ts` + store, re-init on load; prove `pair()` logs proposals.
2. **Sessions** — proposal approval UI, namespace builder, sessions list, disconnect.
3. **Signing core** — refactor digest signer; add `signMessageSmart` / `signTypedDataSmart`; verify recovery.
4. **Requests** — request modal + handlers (personal_sign, typed data, sendTransaction, switchChain).
5. **Capture** — camera QR (mobile) + paste (desktop) polish.
6. **Hardening** — security display, edge cases, error→dApp responses, multi-chain, reconnect.
7. **QA** — real dApps (Uniswap, OpenSea) + Reown test dApp across all 3 connection modes & light/dark.

---

## 13. Decisions (resolved)

1. `eth_sign` (blind) → **rejected / not offered.**
2. Non-active chain → **auto-switch silently** when in serve-set; unknown chain →
   `4902` → `addEthereumChain` / custom-RPC flow (§6.1).
3. Entry point → **both** (header scan icon + menu), with intuitive nav (§8).
4. SIWE `auth_request` → **deferred** (not v1).
5. UI → **build in current UI now**; design direction is **Swiss Editorial** (Liquid Glass
   dropped); restyle to Swiss during the broader redesign.
