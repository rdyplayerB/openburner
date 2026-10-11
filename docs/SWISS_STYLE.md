# Swiss Editorial — conversion guide

The app is moving to one design language: **Swiss Editorial**. Flat surfaces, hairline
rules, generous whitespace, tabular numerals, uppercase tracked micro-labels, a **single
orange accent**, Geist (sans) + Geist Mono (numbers/addresses). No glass, no heavy shadows,
no gradients, no glow, no ember/dread effects.

## Tokens (CSS variables, already defined in globals.css — auto light/dark)
`--sw-paper` page bg · `--sw-surface` raised surface · `--sw-ink` primary text ·
`--sw-ink-soft` secondary text · `--sw-muted` tertiary/labels · `--sw-line` strong hairline ·
`--sw-line-soft` item divider · `--sw-accent` orange · `--sw-accent-press` ·
`--sw-up` green (+%) · `--sw-down` red (errors / -%).

**Dark mode is handled by the tokens.** Do NOT add `dark:` color variants when using tokens —
remove existing `dark:bg-slate-*` / `dark:text-slate-*` etc. and use the token instead.

## Utility classes (globals.css)
`sw-screen` `sw-surface` `sw-uplabel` `sw-seclabel` `sw-rule` `sw-rule-soft` `sw-divide`
`sw-mono` `sw-num` `sw-display` `sw-accent` `sw-btn-primary` `sw-btn-ghost` `sw-tab`
`sw-tab-active` `sw-input` `sw-mark` `sw-row` `sw-list`.

## Class mapping (old → new)
| Old | New |
|---|---|
| `bg-white dark:bg-slate-800` (card) | drop; use hairline separation, or `sw-surface` + `border border-[var(--sw-line)]` |
| `rounded-2xl` / `rounded-3xl` + `shadow-card*` | `rounded-xl` (or none) and **remove shadows** |
| `text-slate-900 dark:text-slate-100` | `text-[var(--sw-ink)]` |
| `text-slate-600/500 dark:text-slate-400` | `text-[var(--sw-muted)]` (labels) or `text-[var(--sw-ink-soft)]` (body) |
| `border-slate-200 dark:border-slate-700` | `border-[var(--sw-line)]` |
| primary `bg-brand-orange … rounded-xl shadow-glow*` | `sw-btn-primary` (+ `py-3 text-sm`) |
| secondary/border button | `sw-btn-ghost` (+ `py-3 text-sm`) |
| inputs `border rounded-lg focus:ring-*` | `sw-input border border-[var(--sw-line)] rounded-lg px-3 py-2.5 text-sm` |
| small gray caption/label | `sw-uplabel` |
| amounts / balances / addresses / hashes / chain ids | add `sw-mono` (small) or `sw-num` |
| big hero balance | `sw-display` (e.g. `text-4xl sw-display`), `$` can be `sw-accent` |
| token icon circle `rounded-full` | squared `rounded-lg`; letter fallback uses `sw-mark` |
| pill/segmented tabs | left-aligned text tabs: `sw-tab` / add `sw-tab-active` |
| success green / error red | `text-[var(--sw-up)]` / `text-[var(--sw-down)]` |
| glass-card-dark, dread-*, flicker, text-chromatic, ember, bg-connected, gradient text | **delete** |

## Modals
- Overlay: `modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50`
- Card: `sw-surface w-full max-w-sm rounded-xl border border-[var(--sw-line)] overflow-hidden`
- Header: `sw-uplabel` kicker or `text-lg font-bold text-[var(--sw-ink)]` title + an `X` button
  (`text-[var(--sw-muted)] hover:text-[var(--sw-ink)]`).

## Copy
Keep text **clear, concise, direct**. Sentence case for body; UPPERCASE only via
`sw-uplabel` / buttons. Trim filler ("Please", "successfully", redundant hints).

## Rules
- Only change `className`s, copy, and minimal structural wrappers. **Do not** change logic,
  props, handlers, state, or exported signatures.
- Reference implementations already in Swiss: `components/walletconnect/*.tsx`.
- Keep token images/Q\R/functionality intact.

## v1.5 additions — calmer, clearer, built for the card

These rules sit on top of everything above. Where they disagree, these win.

### Hierarchy
- **One primary action per screen.** It uses `sw-btn-primary` and stays visible at all
  times. When it can't run yet, it's disabled and its label says what's missing
  ("Enter an amount", "Select a token", "Not enough ETH"). Never hide it.
- **Orange is for action, not decoration.** Don't color headings, token symbols, the "$"
  sign or sort toggles orange. Small accent text (Max, Paste, links) uses `sw-link`
  (contrast-tuned). Tab underlines and focus rings may stay orange.
- **Numbers use the UI sans with tabular figures** (`sw-num`). Geist Mono (`sw-mono`) is
  for addresses, hashes and contract data only.
- **Field labels are sentence case** with `sw-label`. `sw-uplabel` is only for an
  occasional section kicker, not every field.

### Building blocks
| Need | Use |
|---|---|
| Token logo | `TokenIcon` (`components/common/token-icon.tsx`): always a circle, letter fallback, optional `chainId` badge |
| Network logo | `ChainLogo` (same file) |
| Address someone must verify | `AddressText` (`components/common/address-text.tsx`): full address, grouped, ends emphasized |
| Short address | `shortAddress()` (same file) |
| Wallet / recipient identity | `Identicon` (`components/common/identicon.tsx`) |
| Text field | `.sw-field` box with a `.sw-field-input` inside (the box gets the focus ring) |
| Big amount | `.sw-amount-input` (e.g. `text-4xl`) |
| Token / network picker button | `.sw-chip` |
| Quiet icon button | `.sw-icon-btn p-2` |
| Warning / error / note | `.sw-callout` + `sw-callout-warn` / `sw-callout-danger` / `sw-callout-info` |
| Loading placeholder | `.sw-skeleton` with a width and height |
| Quiet fills | `bg-[var(--sw-fill)]`, `bg-[var(--sw-fill-strong)]` |

### Signing
- PIN entry and the card tap are one sheet: `PinInput` with `progress={{ steps, current }}`.
  Mark the step that waits on the card with `card: true`. Its copy ("Tap your Burner",
  plus a hint for phone, gateway or USB reader) follows the live card phase from
  `store/signing-store.ts`, which `lib/smart-signer.ts` updates.
- Typical steps: Prepare → Sign with your Burner (card) → Send to {network}.

### Phones
- `Modal` opens as a bottom sheet under 640px and lifts above the on-screen keyboard.
  Put the primary button at the bottom of the sheet, full width.
- Touch targets are at least 44px tall.

### Motion
- Use the `ob-*` animation classes in `globals.css`. Animate to explain a change
  (a sheet arriving, a balance updating, a step completing), never for decoration.
  Reduced-motion users get none (handled globally).
