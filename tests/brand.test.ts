import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildFlame, smoothnessProblems } from "../design/brand/flame.mjs";
import { FLAME_FULL, FLAME_SMALL } from "@/components/common/brand-mark-paths";

const params = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../design/brand/flame.json"), "utf8"));

describe("brand mark", () => {
  it("has no kinks or curvature jumps at its smooth joints", () => {
    expect(smoothnessProblems(params)).toEqual([]);
  });

  it("ships paths built from the current parameters (run `npm run brand` after editing flame.json)", () => {
    expect(FLAME_FULL).toBe(buildFlame(params));
    expect(FLAME_SMALL).toBe(buildFlame(params, true));
  });

  it("ships the 16 px favicon as an exact 16x16 pixel map", () => {
    const rows = fs.readFileSync(path.resolve(__dirname, "../design/brand/favicon-16.txt"), "utf8").trim().split("\n");
    expect(rows).toHaveLength(16);
    expect(rows.every((r) => /^[.#+]{16}$/.test(r))).toBe(true);
  });
});
