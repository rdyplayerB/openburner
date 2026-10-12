"use client";

import { useId, type CSSProperties } from "react";
import { BURNER_CARD, type BurnerColor } from "@/components/common/burner-card";

/**
 * Illustrations for the welcome slides: labelled diagrams in the app's own
 * style (flat, hairlines, one accent) built from OpenBurner's real screens and
 * the real Burner card renders. All three share a 360 × 270 canvas.
 */

const W = 360;
const H = 270;

const SANS = "var(--font-geist-sans), system-ui, sans-serif";

const ink = (v: string): CSSProperties => ({ fill: `var(--sw-${v})` });

/** Unique, url()-safe ids for one drawing's gradients and filters. */
function useIds() {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return { shadow: `${base}-shadow`, lift: `${base}-lift` };
}

type Ids = ReturnType<typeof useIds>;

function Defs({ ids }: { ids: Ids }) {
  return (
    <defs>
      <filter id={ids.shadow} x="-50%" y="-200%" width="200%" height="500%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id={ids.lift} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000" floodOpacity="0.10" />
      </filter>
    </defs>
  );
}

/** The real Burner card, 3/4 view, `h` tall with its top-left at the origin. */
function AngledCard({ h, color = "purple" }: { h: number; color?: BurnerColor }) {
  return <image href={BURNER_CARD.angled(color)} width={h * BURNER_CARD.angledRatio} height={h} />;
}

/** The real Burner card front, `h` tall with its top-left at the origin. */
function FlatCard({ h, color = "purple" }: { h: number; color?: BurnerColor }) {
  return <image href={BURNER_CARD.flat(color)} width={h * BURNER_CARD.flatRatio} height={h} />;
}

/** NFC waves pointing right, centred on (0, 0). */
function Waves({ active }: { active: boolean }) {
  const cls = (n: string) => (active ? `ob-wave ${n}` : "");
  return (
    <g style={{ stroke: "var(--sw-accent)", fill: "none" }} strokeWidth="2.5" strokeLinecap="round">
      <path className={cls("")} d="M -4 -8 A 10 10 0 0 1 -4 8" />
      <path className={cls("ob-wave-2")} d="M 3 -14 A 18 18 0 0 1 3 14" />
      <path className={cls("ob-wave-3")} d="M 10 -20 A 26 26 0 0 1 10 20" />
    </g>
  );
}

/** A callout: accent dot, leader line, small-caps title and a note. */
function Callout({
  from,
  elbow,
  label,
  note,
  anchor = "start",
  tx,
  ty,
}: {
  from: [number, number];
  elbow: [number, number];
  label: string;
  note: string | string[];
  anchor?: "start" | "end";
  tx: number;
  ty: number;
}) {
  return (
    <g>
      <polyline
        points={`${from[0]},${from[1]} ${elbow[0]},${elbow[1]}`}
        style={{ stroke: "var(--sw-accent)" }}
        strokeWidth="1.25"
        fill="none"
      />
      <circle cx={from[0]} cy={from[1]} r="4.5" style={{ fill: "var(--sw-accent)", stroke: "#fff" }} strokeWidth="1.5" />
      <circle cx={elbow[0]} cy={elbow[1]} r="2" style={ink("accent")} />
      <text x={tx} y={ty} textAnchor={anchor} fontSize="9.5" fontWeight="700" letterSpacing="1.4" style={{ ...ink("ink"), fontFamily: SANS }}>
        {label}
      </text>
      {(Array.isArray(note) ? note : [note]).map((line, i) => (
        <text key={i} x={tx} y={ty + 15 + i * 14} textAnchor={anchor} fontSize="11.5" style={{ ...ink("ink-soft"), fontFamily: SANS }}>
          {line}
        </text>
      ))}
    </g>
  );
}

function Canvas({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full block" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

// ─── 1 · The card is the wallet ─────────────────────────────────────────────

export function CardArt({ active }: { active: boolean }) {
  const ids = useIds();
  // Front card: 196 tall, top-left at (x, 34); fanned cards pivot on its bottom centre.
  const x = 84;
  const h = 196;
  const w = h * BURNER_CARD.flatRatio;
  const pivot = `${x + w / 2} ${34 + h}`;
  // The NFC mark on the card front (chip underneath).
  const nfc: [number, number] = [x + w * 0.235, 34 + h * 0.838];
  return (
    <Canvas label="Burner cards. The secure chip behind the NFC mark makes and holds your keys.">
      <Defs ids={ids} />
      <ellipse cx={x + w / 2 - 14} cy={34 + h + 4} rx="84" ry="6" fill="#000" opacity="0.2" filter={`url(#${ids.shadow})`} />
      <g transform={`rotate(-24 ${pivot}) translate(${x} 34)`}>
        <FlatCard h={h} color="lime" />
      </g>
      <g transform={`rotate(-12 ${pivot}) translate(${x} 34)`}>
        <FlatCard h={h} color="orange" />
      </g>
      <g className={active ? "ob-float" : ""}>
        <g transform={`translate(${x} 34)`}>
          <FlatCard h={h} />
        </g>
        <Callout
          from={nfc}
          elbow={[236, nfc[1]]}
          tx={242}
          ty={nfc[1] - 4}
          label="SECURE CHIP"
          note={["Makes and holds", "your keys"]}
        />
      </g>
    </Canvas>
  );
}

// ─── 2 · More networks ──────────────────────────────────────────────────────

const NETWORKS: { name: string; logo: string; square?: boolean }[] = [
  { name: "Ethereum", logo: "/images/chains/ethereum.png" },
  { name: "Base", logo: "/images/chains/base.svg", square: true },
  { name: "Arbitrum One", logo: "/images/chains/arbitrum.png" },
  { name: "OP Mainnet", logo: "/images/chains/optimism.png" },
  { name: "Polygon", logo: "/images/chains/polygon.png" },
  { name: "BNB Chain", logo: "/images/chains/binance.png" },
  { name: "Avalanche", logo: "/images/chains/avalanche.png" },
  { name: "Linea Mainnet", logo: "/images/chains/linea.png" },
  { name: "Scroll", logo: "/images/chains/scroll.png" },
  { name: "Unichain", logo: "/images/chains/unichain.png" },
];
const SELECTED = "Polygon";

export function NetworksArt({ active }: { active: boolean }) {
  const ids = useIds();
  const sx = 186; // screen left
  return (
    <Canvas label="OpenBurner's network list on a phone, with Polygon selected.">
      <Defs ids={ids} />

      {/* Phone, cropped by the bottom edge */}
      <g filter={`url(#${ids.lift})`}>
        <rect x="180" y="22" width="142" height="290" rx="24" fill="#18181C" />
      </g>
      <rect x="185" y="27" width="132" height="280" rx="19" style={ink("paper")} />
      <rect x="234" y="33" width="34" height="9" rx="4.5" fill="#18181C" />

      {/* OpenBurner's network menu */}
      <g style={{ fontFamily: SANS }}>
        <image href="/images/openburnerlogo.svg" x={sx + 4} y="50" width="13" height="13" />
        <rect x={sx + 22} y="49" width="52" height="15" rx="7.5" style={ink("fill-strong")} />
        <image href="/images/chains/polygon.png" x={sx + 26} y="52.5" width="8" height="8" />
        <text x={sx + 37} y="59.5" fontSize="6.8" fontWeight="600" style={ink("ink")}>
          Polygon
        </text>

        <rect x={sx + 2} y="72" width="126" height="240" rx="8" style={{ ...ink("surface"), stroke: "var(--sw-line-soft)" }} />
        {NETWORKS.map((n, i) => {
          const y = 88 + i * 19;
          const on = n.name === SELECTED;
          return (
            <g key={n.name}>
              {on && <rect x={sx + 5} y={y - 9} width="120" height="18" rx="4" style={ink("fill-strong")} />}
              {n.square ? (
                <image href={n.logo} x={sx + 11} y={y - 4.5} width="9" height="9" />
              ) : (
                <image href={n.logo} x={sx + 10} y={y - 5.5} width="11" height="11" />
              )}
              <text x={sx + 27} y={y + 2.5} fontSize="7" fontWeight={on ? 700 : 500} style={ink("ink")}>
                {n.name}
              </text>
              {on && (
                <path
                  d={`M${sx + 112} ${y} l2.2 2.2 l4 -4.4`}
                  style={{ stroke: "var(--sw-ink)" }}
                  strokeWidth="1.1"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          );
        })}
      </g>

      {/* The card, tapping in from the left */}
      <ellipse cx="84" cy="220" rx="54" ry="5" fill="#000" opacity="0.16" filter={`url(#${ids.shadow})`} />
      <g transform="translate(26 34)">
        <g className={active ? "ob-tap-card" : ""}>
          <AngledCard h={176} />
        </g>
      </g>
      <g transform="translate(168 72)">
        <Waves active={active} />
      </g>
    </Canvas>
  );
}

// ─── 3 · Build on it ────────────────────────────────────────────────────────

type Tok = [string, "kw" | "fn" | "str" | "cm" | "tx"];
const CODE: Tok[][] = [
  [["import", "kw"], [" { ", "tx"], ["getBurnerAddress", "fn"], [" } ", "tx"], ["from", "kw"], [' "@/lib/burner";', "str"]],
  [["import", "kw"], [" { ", "tx"], ["signMessageSmart", "fn"], [" } ", "tx"], ["from", "kw"], [' "@/lib/smart-signer";', "str"]],
  [],
  [["// Tap the card to read its address", "cm"]],
  [["const", "kw"], [" { address, keySlot } = ", "tx"], ["await", "kw"], [" ", "tx"], ["getBurnerAddress", "fn"], ["();", "tx"]],
  [],
  [["// PIN + tap to sign with it", "cm"]],
  [["await", "kw"], [" ", "tx"], ["signMessageSmart", "fn"], ["(", "tx"], ['"gm"', "str"], [", keySlot, pin);", "tx"]],
];

const TOKEN_STYLE: Record<Tok[1], CSSProperties> = {
  kw: { fill: "var(--sw-accent-ink)", fontWeight: 600 },
  fn: { fill: "var(--sw-ink)", fontWeight: 600 },
  str: { fill: "var(--sw-up)" },
  cm: { fill: "var(--sw-muted)" },
  tx: { fill: "var(--sw-ink-soft)" },
};

export function BuildArt({ active }: { active: boolean }) {
  const ids = useIds();
  const MONO = "var(--font-geist-mono), ui-monospace, monospace";
  return (
    <Canvas label="A short code sample that reads a Burner card and signs with it.">
      <Defs ids={ids} />

      {/* Terminal */}
      <g filter={`url(#${ids.lift})`}>
        <rect x="14" y="20" width="332" height="30" rx="8" fill="#18181C" />
      </g>
      <text x="28" y="39" fontSize="9" fill="#9A9AA2" style={{ fontFamily: MONO }}>
        $ <tspan fill="#F2F2F4">git clone github.com/rdyplayerB/openburner</tspan>
      </text>

      {/* Editor */}
      <g filter={`url(#${ids.lift})`}>
        <rect x="14" y="60" width="332" height="170" rx="10" style={{ ...ink("surface"), stroke: "var(--sw-line-soft)" }} />
      </g>
      <text x="28" y="80" fontSize="8" style={{ ...ink("muted"), fontFamily: MONO }}>
        my-burner-app.ts
      </text>
      <rect x="14" y="88" width="332" height="1" style={ink("line-soft")} />
      <g style={{ fontFamily: MONO }} fontSize="8.4">
        {CODE.map((line, i) => (
          <g key={i}>
            <text x="34" y={106 + i * 14} textAnchor="end" style={ink("muted")} opacity="0.7">
              {i + 1}
            </text>
            <text x="42" y={106 + i * 14} xmlSpace="preserve">
              {line.map(([t, k], j) => (
                <tspan key={j} style={TOKEN_STYLE[k]}>
                  {t}
                </tspan>
              ))}
            </text>
          </g>
        ))}
      </g>

      {/* The card */}
      <g transform="translate(276 186) rotate(10)">
        <g className={active ? "ob-float" : ""}>
          <AngledCard h={112} />
        </g>
      </g>
    </Canvas>
  );
}

// ─── 4 · Nothing moves without your card ────────────────────────────────────

export function SignArt({ active }: { active: boolean }) {
  const ids = useIds();
  const x = 34; // sheet left
  const row = (y: number, label: string, value: React.ReactNode) => (
    <g>
      <text x={x + 18} y={y} fontSize="9" style={ink("muted")}>
        {label}
      </text>
      <g transform={`translate(${x + 206} ${y})`}>{value}</g>
    </g>
  );
  return (
    <Canvas label="A send waiting for your PIN and a tap of your card.">
      <Defs ids={ids} />

      <g filter={`url(#${ids.lift})`}>
        <rect x={x} y="20" width="224" height="226" rx="14" style={{ ...ink("surface"), stroke: "var(--sw-line-soft)" }} />
      </g>

      <g style={{ fontFamily: SANS }}>
        <text x={x + 18} y="44" fontSize="7.5" fontWeight="700" letterSpacing="1.3" style={ink("muted")}>
          REVIEW
        </text>
        <text x={x + 18} y="69" fontSize="20" fontWeight="800" letterSpacing="-0.6" style={ink("ink")}>
          Send 0.25 ETH
        </text>
        <text x={x + 18} y="83" fontSize="9" style={ink("muted")}>
          ≈ $632.93
        </text>
        <rect x={x + 18} y="95" width="188" height="1" style={ink("line-soft")} />

        {row(
          114,
          "To",
          <>
            <circle cx="-60" cy="-3" r="5" fill="#7C5CFF" />
            <text textAnchor="end" fontSize="9" fontWeight="600" style={ink("ink")}>
              brantly.eth
            </text>
          </>
        )}
        {row(
          132,
          "Network",
          <>
            <rect x="-35" y="-8" width="9" height="9" rx="1.5" fill="#0000FF" />
            <text textAnchor="end" fontSize="9" fontWeight="600" style={ink("ink")}>
              Base
            </text>
          </>
        )}
        {row(
          150,
          "Fee",
          <text textAnchor="end" fontSize="9" fontWeight="600" style={ink("ink")}>
            $0.02
          </text>
        )}
        <rect x={x + 18} y="163" width="188" height="1" style={ink("line-soft")} />

        {/* Step 1: PIN, done */}
        <circle cx={x + 26} cy="186" r="8" style={ink("up")} />
        <path d={`M${x + 22.5} 186 l2.5 2.5 l4.5 -5`} stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x={x + 42} y="189.5" fontSize="10" fontWeight="600" style={ink("ink")}>
          PIN
        </text>
        {Array.from({ length: 6 }, (_, i) => (
          <circle key={i} cx={x + 72 + i * 11} cy="186" r="3" style={ink("ink")} />
        ))}

        {/* Step 2: tap, waiting */}
        <circle cx={x + 26} cy="216" r="8" style={ink("accent")} />
        {active && (
          <circle cx={x + 26} cy="216" r="8" fill="none" style={{ stroke: "var(--sw-accent)" }} strokeWidth="1.5" className="ob-ping" />
        )}
        <text x={x + 26} y="219.2" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fff">
          2
        </text>
        <text x={x + 42} y="219.5" fontSize="10" fontWeight="600" style={ink("ink")}>
          Tap your card
        </text>
      </g>

      {/* The card, coming in to sign */}
      <g transform="translate(242 112)">
        <g className={active ? "ob-tap-card ob-tap-left" : ""}>
          <AngledCard h={166} />
        </g>
      </g>
      <g transform="translate(240 176) scale(-1 1)">
        <Waves active={active} />
      </g>
    </Canvas>
  );
}
