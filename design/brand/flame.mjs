/**
 * The OpenBurner flame, built from circles and smooth cubic curves.
 *
 * Two crescents sit on one outer circle. The left crescent rises into the flame
 * tip (with a deliberate notch at the shoulder) and carries a thin inner tongue;
 * the right crescent's inner edge is an S-curve. The "small" variant (used below
 * 44 px) is one closed flame on the same circle and tip, with a teardrop cut out
 * of it: open crescents blur into "( )" at header sizes, a solid flame doesn't.
 *
 * Parameters live in flame.json (viewBox 0 0 320 377). `buildFlame()` returns the
 * two path strings; `smoothnessProblems()` lists joints that kink.
 */

const fmt = (v) => String(Math.round(v * 100) / 100);
const P = (p) => `${fmt(p[0])} ${fmt(p[1])}`;

function onCircle([cx, cy], r, x, upper) {
  const dy = Math.sqrt(Math.max(0, r * r - (x - cx) ** 2));
  return [x, upper ? cy - dy : cy + dy];
}

/** Circle whose leftmost point has x = minX, passing through p and q. */
function circleThrough(p, q, minX) {
  let best = null;
  for (let i = 1; i <= 200000; i++) {
    const r = i / 100;
    const cx = minX + r;
    const d = r * r - (p[0] - cx) ** 2;
    if (d < 0) continue;
    const cy = p[1] + Math.sqrt(d);
    const err = Math.abs((q[0] - cx) ** 2 + (q[1] - cy) ** 2 - r * r);
    if (!best || err < best.err) best = { err, cx, cy, r };
  }
  return best;
}

/** The small variant's right edge meets the circle at `s_join_deg`, tangent to it. */
function smallJoin(k) {
  const t = (k.s_join_deg * Math.PI) / 180;
  const J = [k.cx + k.r * Math.cos(t), k.cy + k.r * Math.sin(t)];
  const tan = [-Math.sin(t), Math.cos(t)];
  const c2 = [J[0] - k.s_join_len * tan[0], J[1] - k.s_join_len * tan[1]];
  return { J, c2 };
}

/** The teardrop cut out of the small variant: a tip, two side curves and a round base. */
function smallTongue(k) {
  const { tip, c, r, hl, hr } = k.s_tongue;
  const L = [c[0] - r, c[1]];
  const Rr = [c[0] + r, c[1]];
  return {
    L, Rr, r,
    right: [tip, [tip[0] + hr[0], tip[1] + hr[1]], [Rr[0], Rr[1] - hr[2]], Rr],
    left: [L, [L[0], L[1] - hl[2]], [tip[0] + hl[0], tip[1] + hl[1]], tip],
  };
}

export function buildFlame(k, small = false) {
  const g = (key) => (small && k[`s_${key}`] !== undefined ? k[`s_${key}`] : k[key]);
  const O = [k.cx, k.cy];
  const R = k.r;
  const S = onCircle(O, R, g("shoulder_x"), true);
  const T = g("tip");
  const start = [`A${fmt(R)} ${fmt(R)} 0 0 1 ${P(S)}`, `C${P(g("tip_out_c1"))} ${P(g("tip_out_c2"))} ${P(T)}`];
  if (small) {
    const { J, c2 } = smallJoin(k);
    const t = smallTongue(k);
    return [
      `M${P(J)}`, `A${fmt(R)} ${fmt(R)} 0 1 1 ${P(S)}`, start[1], `C${P(k.s_tip_r_c1)} ${P(c2)} ${P(J)}Z`,
      `M${P(t.right[0])}`, `C${P(t.right[1])} ${P(t.right[2])} ${P(t.Rr)}`,
      `A${fmt(t.r)} ${fmt(t.r)} 0 0 1 ${P(t.L)}`, `C${P(t.left[1])} ${P(t.left[2])} ${P(t.left[3])}Z`,
    ].join("");
  }
  const Lb = onCircle(O, R, k.lb_x, false);
  const Rt = onCircle(O, R, k.rt_x, true);
  const Rb = onCircle(O, R, k.rb_x, false);
  const J = k.J;
  const inner = circleThrough(J, Lb, k.inner_minx);
  const d = [`M${P(Lb)}`, ...start];
  d.push(`C${P(k.tip_in_c1)} ${P(k.tip_in_c2)} ${P(k.K)}`);
  d.push(`C${P(k.tongue_r_c1)} ${P(k.tongue_r_c2)} ${P(k.P)}`);
  d.push(`C${P(k.tongue_l_c1)} ${P(k.tongue_l_c2)} ${P(J)}`);
  d.push(`A${fmt(inner.r)} ${fmt(inner.r)} 0 0 0 ${P(Lb)}Z`);
  d.push(`M${P(Rt)}`, `A${fmt(R)} ${fmt(R)} 0 0 1 ${P(Rb)}`);
  d.push(`C${P(k.r1c1)} ${P(k.r1c2)} ${P(k.rM)}`);
  d.push(`C${P(k.r2c1)} ${P(k.r2c2)} ${P(Rt)}Z`);
  return d.join("");
}

/** Signed curvature at the start (t=0) or end (t=1) of a cubic Bezier. */
function endCurvature(p0, p1, p2, p3, atEnd) {
  const [a, b, c] = atEnd ? [p3, p2, p1] : [p0, p1, p2];
  const d1 = [b[0] - a[0], b[1] - a[1]];
  const d2 = [c[0] - b[0], c[1] - b[1]];
  const len = Math.hypot(d1[0], d1[1]);
  const k = ((2 / 3) * (d1[0] * d2[1] - d1[1] * d2[0])) / len ** 3;
  return atEnd ? -k : k; // walked backwards from the end, so flip the sign back

}

/**
 * Joints meant to be smooth: they must not kink (> 0.5°) and their curvature
 * must not jump (> 1.5x either side), which reads as an elbow at large sizes.
 */
export function smoothnessProblems(k) {
  const ang = (a, b) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const diff = (x, y) => Math.abs(((x - y + 540) % 360) - 180);
  const out = [];
  const kink = diff(ang(k.tip_in_c2, k.K), ang(k.K, k.tongue_r_c1));
  if (kink > 0.5) out.push(`K kinks ${kink.toFixed(1)}°`);
  const m = diff(ang(k.r1c2, k.rM), ang(k.rM, k.r2c1));
  if (m > 0.5) out.push(`rM kinks ${m.toFixed(1)}°`);
  const O = [k.cx, k.cy];
  const jump = (name, kin, kout) => {
    const r = Math.max(Math.abs(kin), Math.abs(kout)) / Math.max(1e-9, Math.min(Math.abs(kin), Math.abs(kout)));
    if (r > 1.5 || Math.sign(kin) !== Math.sign(kout)) out.push(`${name} curvature jumps ${r.toFixed(2)}x`);
  };
  jump("K", endCurvature(k.tip, k.tip_in_c1, k.tip_in_c2, k.K, true), endCurvature(k.K, k.tongue_r_c1, k.tongue_r_c2, k.P, false));
  const Rb = onCircle(O, k.r, k.rb_x, false);
  const Rt = onCircle(O, k.r, k.rt_x, true);
  jump("rM", endCurvature(Rb, k.r1c1, k.r1c2, k.rM, true), endCurvature(k.rM, k.r2c1, k.r2c2, Rt, false));
  // Small variant: the right edge lands on the circle without an elbow, and the
  // teardrop's sides flow into its round base. Arcs curve clockwise (positive).
  const { J: sj, c2 } = smallJoin(k);
  jump("s_join", endCurvature(k.s_tip, k.s_tip_r_c1, c2, sj, true), 1 / k.r);
  const t = smallTongue(k);
  jump("s_tongue right", endCurvature(...t.right, true), 1 / t.r);
  jump("s_tongue left", 1 / t.r, endCurvature(...t.left, false));
  return out;
}
