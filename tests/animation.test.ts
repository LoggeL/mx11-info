import assert from "node:assert/strict";
import { test } from "node:test";
import { motionStyle, valueAt, easing } from "../src/lib/animation-values";
test("identity transforms do not create a new containing block", () => {
  assert.equal(motionStyle({ y: 0, scale: 1, rotate: 0 }).transform, "none");
});
test("hover and entry transforms preserve the existing design values", () => {
  assert.deepEqual(motionStyle({ y: -4, scale: 1.03, opacity: 1 }), { opacity: 1, transform: "translateY(-4px) scale(1.03)" });
});
test("loop keyframes return to their original position", () => {
  assert.deepEqual(valueAt({ y: [0, 8, 0] }, 1), { y: 8 });
  assert.deepEqual(valueAt({ y: [0, 8, 0] }), { y: 0 });
});
test("the original timing curves retain their browser equivalents", () => {
  assert.equal(easing("easeOut"), "cubic-bezier(0,0,0.58,1)");
  assert.equal(easing([0.16, 1, 0.3, 1]), "cubic-bezier(0.16,1,0.3,1)");
});
