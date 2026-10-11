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
    // Groups are inline blocks with a gap (not spaces), so lines wrap between
    // groups and a manual copy still yields the exact address.
    <span className={`sw-mono leading-relaxed ${className}`}>
      {groups.map((g, i) => {
        const strong = i === 0 || i === last;
        return (
          <span key={i} className={`inline-block whitespace-nowrap ${i < last ? "mr-[0.35em]" : ""}`}>
            {i === 0 && <span className="text-[var(--sw-muted)]">0x</span>}
            <span className={strong ? "text-[var(--sw-ink)] font-semibold" : "text-[var(--sw-ink-soft)]"}>{g}</span>
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
