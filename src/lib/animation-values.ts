import type { CSSProperties } from "react";

type Scalar = number | string;
export type MotionValues = Partial<Record<"opacity" | "x" | "y" | "scale" | "rotate" | "height" | "filter", Scalar | Scalar[]>>;
export interface Transition { duration?: number; delay?: number; ease?: string | number[]; repeat?: number; }
export function valueAt(values: MotionValues, index = -1): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) =>
    [key, Array.isArray(value) ? value[index < 0 ? value.length - 1 : Math.min(index, value.length - 1)] : value]));
}
export function motionStyle(values: MotionValues): CSSProperties {
  const { x = 0, y = 0, scale = 1, rotate = 0, ...css } = valueAt(values);
  const transforms = [
    Number(x) !== 0 ? `translateX(${x}px)` : "",
    Number(y) !== 0 ? `translateY(${y}px)` : "",
    Number(scale) !== 1 ? `scale(${scale})` : "",
    Number(rotate) !== 0 ? `rotate(${rotate}deg)` : "",
  ].filter(Boolean);
  return { ...css, transform: transforms.join(" ") || "none" } as CSSProperties;
}
export function easing(value?: string | number[]) {
  if (Array.isArray(value)) return `cubic-bezier(${value.join(",")})`;
  return ({ easeOut: "cubic-bezier(0,0,0.58,1)", easeInOut: "cubic-bezier(0.42,0,0.58,1)" } as Record<string, string>)[value ?? ""] || value || "ease";
}
