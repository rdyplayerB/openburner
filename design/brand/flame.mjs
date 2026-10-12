/**
 * The OpenBurner flame, built from circles and smooth cubic curves.
 *
 * Two crescents sit on one outer circle. The left crescent rises into the flame
 * tip (with a deliberate notch at the shoulder) and carries a thin inner tongue;
 * the right crescent's inner edge is an S-curve. The "small" variant (used below
 * 44 px) drops the tongue, thickens both crescents and narrows the bottom gap.
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

export function buildFlame(k, small = false) {
  const g = (key) => (small && k[`s_${key}`] !== undefined ? k[`s_${key}`] : k[key]);
  const O = [k.cx, k.cy];
  const R = k.r;
  const Lb = onCircle(O, R, g("lb_x"), false);
  const S = onCircle(O, R, g("shoulder_x"), true);
  const T = g("tip");
  const Rt = onCircle(O, R, g("rt_x"), true);
  const Rb = onCircle(O, R, g("rb_x"), false);
  const J = g("J");
  const inner = circleThrough(J, Lb, g("inner_minx"));
  const d = [`M${P(Lb)}`, `A${fmt(R)} ${fmt(R)} 0 0 1 ${P(S)}`, `C${P(g("tip_out_c1"))} ${P(g("tip_out_c2"))} ${P(T)}`];
  if (small) {
    d.push(`C${P(k.s_tip_in_c1)} ${P(k.s_tip_in_c2)} ${P(J)}`);
  } else {
    d.push(`C${P(k.tip_in_c1)} ${P(k.tip_in_c2)} ${P(k.K)}`);
    d.push(`C${P(k.tongue_r_c1)} ${P(k.tongue_r_c2)} ${P(k.P)}`);
    d.push(`C${P(k.tongue_l_c1)} ${P(k.tongue_l_c2)} ${P(J)}`);
  }
  d.push(`A${fmt(inner.r)} ${fmt(inner.r)} 0 0 0 ${P(Lb)}Z`);
  d.push(`M${P(Rt)}`, `A${fmt(R)} ${fmt(R)} 0 0 1 ${P(Rb)}`);
  d.push(`C${P(g("r1c1"))} ${P(g("r1c2"))} ${P(g("rM"))}`);
  d.push(`C${P(g("r2c1"))} ${P(g("r2c2"))} ${P(Rt)}Z`);
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
  for (const p of ["", "s_"]) {
    const get = (key) => k[p + key] ?? k[key];
    const m = diff(ang(get("r1c2"), get("rM")), ang(get("rM"), get("r2c1")));
    if (m > 0.5) out.push(`${p}rM kinks ${m.toFixed(1)}°`);
  }
  const O = [k.cx, k.cy];
  const jump = (name, kin, kout) => {
    const r = Math.max(Math.abs(kin), Math.abs(kout)) / Math.max(1e-9, Math.min(Math.abs(kin), Math.abs(kout)));
    if (r > 1.5 || Math.sign(kin) !== Math.sign(kout)) out.push(`${name} curvature jumps ${r.toFixed(2)}x`);
  };
  jump("K", endCurvature(k.tip, k.tip_in_c1, k.tip_in_c2, k.K, true), endCurvature(k.K, k.tongue_r_c1, k.tongue_r_c2, k.P, false));
  const Rb = onCircle(O, k.r, k.rb_x, false);
  const Rt = onCircle(O, k.r, k.rt_x, true);
  jump("rM", endCurvature(Rb, k.r1c1, k.r1c2, k.rM, true), endCurvature(k.rM, k.r2c1, k.r2c2, Rt, false));
  const Lb = onCircle([k.cx, k.cy], k.r, k.s_lb_x ?? k.lb_x, false);
  const c = circleThrough(k.s_J, Lb, k.s_inner_minx);
  const leave = (Math.atan2(-(k.s_J[0] - c.cx), k.s_J[1] - c.cy) * 180) / Math.PI;
  const arrive = ang(k.s_tip_in_c2, k.s_J);
  const sj = Math.min(diff(arrive, leave), diff(arrive, leave + 180));
  if (sj > 0.5) out.push(`s_J kinks ${sj.toFixed(1)}°`);
  return out;
}
