# Swiss Editorial — conversion guide

The app is moving to one design language: **Swiss Editorial**. Flat surfaces, hairline
rules, generous whitespace, tabular numerals, uppercase tracked micro-labels, a **single
orange accent**, Geist (sans) + Geist Mono (numbers/addresses). No glass, no heavy shadows,
no gradients, no glow, no ember/dread effects.

## Tokens (CSS variables, already defined in globals.css — auto light/dark)
Tailwind 4 reads its theme from `@theme` in `app/globals.css`; there is no `tailwind.config`.
Use a token with Tailwind 4's variable shorthand: `text-(--sw-ink)`, `border-(--sw-line)`.
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
| `bg-white dark:bg-slate-800` (card) | drop; use hairline separation, or `sw-surface` + `border border-(--sw-line)` |
| `rounded-2xl` / `rounded-3xl` + `shadow-card*` | `rounded-xl` (or none) and **remove shadows** |
| `text-slate-900 dark:text-slate-100` | `text-(--sw-ink)` |
| `text-slate-600/500 dark:text-slate-400` | `text-(--sw-muted)` (labels) or `text-(--sw-ink-soft)` (body) |
| `border-slate-200 dark:border-slate-700` | `border-(--sw-line)` |
| primary `bg-brand-orange … rounded-xl shadow-glow*` | `sw-btn-primary` (+ `py-3 text-sm`) |
| secondary/border button | `sw-btn-ghost` (+ `py-3 text-sm`) |
| inputs `border rounded-lg focus:ring-*` | `sw-input border border-(--sw-line) rounded-lg px-3 py-2.5 text-sm` |
| small gray caption/label | `sw-uplabel` |
| amounts / balances / addresses / hashes / chain ids | add `sw-mono` (small) or `sw-num` |
| big hero balance | `sw-display` (e.g. `text-4xl sw-display`), `$` can be `sw-accent` |
| token icon circle `rounded-full` | squared `rounded-lg`; letter fallback uses `sw-mark` |
| pill/segmented tabs | left-aligned text tabs: `sw-tab` / add `sw-tab-active` |
| success green / error red | `text-(--sw-up)` / `text-(--sw-down)` |
| glass-card-dark, dread-*, flicker, text-chromatic, ember, bg-connected, gradient text | **delete** |

## Modals
- Overlay: `modal-overlay bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50`
- Card: `sw-surface w-full max-w-sm rounded-xl border border-(--sw-line) overflow-hidden`
- Header: `sw-uplabel` kicker or `text-lg font-bold text-(--sw-ink)` title + an `X` button
  (`text-(--sw-muted) hover:text-(--sw-ink)`).

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

### Logo
- Use `<BrandMark size={px} />` or `<Wordmark fontSize={px} />` from
  `components/common/brand-mark.tsx`. Never an `<img>` of the logo: the inline flame
  takes the theme's accent orange (`--sw-accent`), so it always matches the buttons.
- The wordmark is one colour: "OpenBurner" in ink, the flame is the only orange. Don't
  colour part of the name.
- Don't build the lockup by hand. `Wordmark` sizes and places the flame, the gap and the
  letter spacing from the font size.
- The flame is one solid drawing with a teardrop cut out, at every size. An earlier open two-crescent drawing read as "( )" at header sizes and looked like a different logo.
- Clear space: at least half the flame's width on every side. Minimum size: 16 px tall.
- Don't stretch, outline, rotate, recolour (other than ink or white on orange), or put
  the flame on a busy photo.
- The geometry lives in `design/brand/flame.json`. After editing it, run
  `npm run brand` to rebuild the component paths, logo SVG, app icons and favicon
  (16 px is drawn by hand in `design/brand/favicon-16.txt`). Tests fail if the
  shipped paths are out of date or a smooth joint kinks.

### Line breaks
- Never leave one word alone on the last line. `globals.css` sets `text-wrap: balance` on
  headings and `text-wrap: pretty` on everything else. Where the text matters most (welcome
  slides), the last two words are also joined with a non-breaking space for browsers
  without `text-wrap`.

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
| Quiet fills | `bg-(--sw-fill)`, `bg-(--sw-fill-strong)` |
| A Burner Ethereum card | `BURNER_CARD` (`components/common/burner-card.ts`): the real renders in `public/images/cards` (`angled` for tap moments, `flat` for the front). Never draw a Burner Ethereum card. |

### Signing
- PIN entry and the card tap are one sheet: `PinInput` with `progress={{ steps, current }}`.
  Mark the step that waits on the card with `card: true`. Its copy ("Tap your Burner",
  plus a hint for phone, gateway or USB reader) follows the live card phase from
  `store/signing-store.ts`, which `lib/smart-signer.ts` updates.
- Typical steps: Prepare → Sign with your Burner (card) → Send to {network}.
- `PinInput` renders `SigningProgress` (`components/signing/signing-progress.tsx`), whose
  tap animation matches the reader: the card meeting the top of a phone, or rings where
  it lands on a USB reader. It uses the `ob-tap-*`, `ob-phone-buzz` and `ob-ripple` classes.

### Phones
- `Modal` opens as a bottom sheet under 640px and lifts above the on-screen keyboard.
  Put the primary button at the bottom of the sheet, full width.
- Touch targets are at least 44px tall.

### Motion
- Use the `ob-*` animation classes in `globals.css`. Animate to explain a change
  (a sheet arriving, a balance updating, a step completing), never for decoration.
  Reduced-motion users get none (handled globally).
