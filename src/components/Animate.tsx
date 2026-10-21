"use client";

import {
  Children, createContext, createElement, isValidElement, useCallback, useContext,
  useEffect, useLayoutEffect, useMemo, useRef, useState,
  type ComponentPropsWithoutRef, type JSX, type ReactElement, type ReactNode,
} from "react";
import { easing, motionStyle, valueAt, type MotionValues, type Transition } from "@/lib/animation-values";

interface MotionProps {
  initial?: MotionValues;
  animate?: MotionValues;
  exit?: MotionValues;
  whileInView?: MotionValues;
  whileHover?: MotionValues;
  transition?: Transition;
  viewport?: { once?: boolean; margin?: string };
}
interface Presence {
  present: boolean;
  register: (id: symbol) => () => void;
  complete: (id: symbol) => void;
}
const PresenceContext = createContext<Presence | null>(null);
function PresenceChild({ present, onRemove, children }: { present: boolean; onRemove: () => void; children: ReactElement }) {
  const active = useRef(new Map<symbol, boolean>());
  const latest = useRef({ present, onRemove });
  useLayoutEffect(() => {
    latest.current = { present, onRemove };
    if (present) active.current.forEach((_, id) => active.current.set(id, false));
    else if (active.current.size === 0) onRemove();
  }, [present, onRemove]);
  const finish = useCallback(() => {
    if (!latest.current.present && Array.from(active.current.values()).every(Boolean)) latest.current.onRemove();
  }, []);
  const register = useCallback((id: symbol) => {
    active.current.set(id, false);
    return () => { active.current.delete(id); finish(); };
  }, [finish]);
  const complete = useCallback((id: symbol) => { active.current.set(id, true); finish(); }, [finish]);
  const context = useMemo(() => ({ present, register, complete }), [present, register, complete]);
  return <PresenceContext.Provider value={context}>{children}</PresenceContext.Provider>;
}

/** Retain exiting children until their own browser animations finish. */
export function AnimatePresence({ children }: { children: ReactNode }) {
  const current = Children.toArray(children).filter(isValidElement);
  const byKey = new Map(current.map(child => [child.key, child]));
  const [retained, setRetained] = useState(current);
  useLayoutEffect(() => {
    const next = Children.toArray(children).filter(isValidElement);
    const keys = new Set(next.map(child => child.key));
    setRetained(previous => [...next, ...previous.filter(child => !keys.has(child.key))]);
  }, [children]);
  const remove = useCallback((key: ReactElement["key"]) =>
    setRetained(previous => previous.filter(child => child.key !== key)), []);
  return retained.map(child => (
    <PresenceChild key={child.key} present={byKey.has(child.key)} onRemove={() => remove(child.key)}>
      {byKey.get(child.key) ?? child}
    </PresenceChild>
  ));
}

function animated<Tag extends keyof JSX.IntrinsicElements>(tag: Tag) {
  return function AnimatedElement(props: ComponentPropsWithoutRef<Tag> & MotionProps) {
    const { initial, animate, exit, whileInView, whileHover, transition, viewport, ...dom } = props;
    const element = useRef<HTMLElement | SVGElement>(null);
    const animation = useRef<Animation | null>(null);
    const presence = useContext(PresenceContext);
    const id = useRef(Symbol("animation"));
    const [firstStyle] = useState(() => motionStyle(initial ?? valueAt(animate ?? {}, 0)));
    const options = useRef({ initial, animate, exit, whileInView, whileHover, transition, viewport, presence });
    useLayoutEffect(() => { options.current = { initial, animate, exit, whileInView, whileHover, transition, viewport, presence }; });
    const targetKey = JSON.stringify({ animate, whileInView, initial, exit, transition, viewport });
    const hasExit = !!exit;
    const registerExit = presence?.register;
    useLayoutEffect(() => {
      if (!hasExit || !registerExit) return;
      return registerExit(id.current);
    }, [hasExit, registerExit]);

    useEffect(() => {
      const node = element.current;
      if (!node) return;
      const { initial, animate, exit, whileInView, transition = {}, viewport, presence } = options.current;
      let disposed = false, observer: IntersectionObserver | undefined;
      let target: MotionValues = animate ?? {};
      const run = (values: MotionValues, done?: () => void) => {
        const style = motionStyle(values);
        const final = { ...style };
        const computed = getComputedStyle(node);
        const start: Record<string, string> = {};
        for (const name of Object.keys(style)) start[name] = computed.getPropertyValue(name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`));
        animation.current?.cancel();
        if (style.height === "auto") style.height = `${node.scrollHeight}px`;
        const count = Math.max(0, ...Object.values(values).map(value => Array.isArray(value) ? value.length : 0));
        const frames = count > 1
          ? Array.from({ length: count }, (_, index) => motionStyle(valueAt(values, index)) as Keyframe)
          : [start, style as Keyframe];
        const applyFinal = () => { Object.assign(node.style, final); done?.(); };
        if (!node.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { applyFinal(); return; }
        const current = node.animate(frames, {
          duration: (transition.duration ?? 0.3) * 1000, delay: (transition.delay ?? 0) * 1000,
          easing: easing(transition.ease), iterations: transition.repeat === Infinity ? Infinity : (transition.repeat ?? 0) + 1,
          fill: "both",
        });
        animation.current = current;
        void current.finished.then(() => {
          if (disposed || animation.current !== current) return;
          applyFinal(); current.cancel();
        }).catch(() => {});
      };
      if (presence?.present === false) {
        if (exit) run(exit, () => presence.complete(id.current));
      } else if (whileInView) {
        observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            target = { ...animate, ...whileInView }; run(target);
            if (viewport?.once) observer?.disconnect();
          } else if (!viewport?.once) run(initial ?? {});
        }, { rootMargin: viewport?.margin ?? "0px" });
        observer.observe(node);
      } else run(target);
      const enter = () => { const hover = options.current.whileHover; if (hover) run({ ...target, ...hover }); };
      const leave = () => { if (options.current.whileHover) run(target); };
      node.addEventListener("pointerenter", enter);
      node.addEventListener("pointerleave", leave);
      return () => {
        disposed = true; observer?.disconnect(); animation.current?.cancel();
        node.removeEventListener("pointerenter", enter); node.removeEventListener("pointerleave", leave);
      };
    }, [targetKey, presence?.present]);

    return createElement(tag, { ...dom, ref: element, style: { ...firstStyle, ...("style" in dom ? dom.style : {}) } });
  };
}

/** Only the animation properties used by this design are supported. */
export const motion = {
  div: animated("div"), a: animated("a"), svg: animated("svg"), span: animated("span"),
  p: animated("p"), h1: animated("h1"), h2: animated("h2"), img: animated("img"),
};
