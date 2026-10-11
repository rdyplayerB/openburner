"use client";

/**
 * A full address, grouped in fours, with the first and last characters
 * emphasised. Address-poisoning attacks copy the ends of an address people
 * have used, so checking the ends only is not enough — this makes the whole
 * address readable while still drawing the eye to the parts people compare.
 */
export function AddressText({ address, className = "" }: { address: string; className?: string }) {
  const body = address.replace(/^0x/i, "");
  const groups = body.match(/.{1,4}/g) ?? [body];
  const last = groups.length - 1;

  return (
    <span className={`sw-mono break-all leading-relaxed ${className}`} aria-label={address}>
      <span className="text-[var(--sw-muted)]">0x</span>
      {groups.map((g, i) => {
        const strong = i === 0 || i === last;
        return (
          <span key={i} aria-hidden="true">
            <span className={strong ? "text-[var(--sw-ink)] font-semibold" : "text-[var(--sw-ink-soft)]"}>{g}</span>
            {i < last && <span className="inline-block w-[0.3em]" />}
          </span>
        );
      })}
    </span>
  );
}

export function shortAddress(address: string, head = 6, tail = 4): string {
  if (!address) return "";
  return address.length <= head + tail ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;
}
