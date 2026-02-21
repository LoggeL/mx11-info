"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type State = "normal" | "warning" | "active";

function getBerlinNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
}

function getState(): { state: State; ms: number } {
  const now = getBerlinNow();
  const total = now.getHours() * 60 + now.getMinutes();

  const WARNING = 6 * 60;       // 06:00
  const START   = 6 * 60 + 30;  // 06:30
  const END     = 7 * 60;       // 07:00

  if (total >= START && total < END) {
    const end = new Date(now); end.setHours(7, 0, 0, 0);
    return { state: "active", ms: end.getTime() - now.getTime() };
  }
  if (total >= WARNING && total < START) {
    const start = new Date(now); start.setHours(6, 30, 0, 0);
    return { state: "warning", ms: start.getTime() - now.getTime() };
  }
  // Next 06:30
  const next = new Date(now);
  if (total >= END) next.setDate(next.getDate() + 1);
  next.setHours(6, 30, 0, 0);
  return { state: "normal", ms: next.getTime() - now.getTime() };
}

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Small inline row for the Network section */
export function MaintenanceIndicator() {
  const [info, setInfo] = useState<{ state: State; ms: number } | null>(null);

  useEffect(() => {
    setInfo(getState());
    const id = setInterval(() => setInfo(getState()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!info) return null;

  const { state, ms } = info;
  const dot =
    state === "active"  ? "bg-red-400 animate-pulse" :
    state === "warning" ? "bg-yellow-400 animate-pulse" :
                          "bg-white/20";
  const label =
    state === "active"  ? "Maintenance active" :
    state === "warning" ? "Maintenance soon" :
                          "Next maintenance";

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-white/40 text-xs font-mono">{label}</span>
      </div>
      <span className={`text-xs font-mono font-semibold tabular-nums ${
        state === "active"  ? "text-red-400" :
        state === "warning" ? "text-yellow-400" :
                              "text-white/30"
      }`}>
        {state === "active" ? `ends in ${fmt(ms)}` : fmt(ms)}
      </span>
    </div>
  );
}

/** Prominent sticky banner — only visible during warning / active */
export function MaintenanceBanner() {
  const [info, setInfo] = useState<{ state: State; ms: number } | null>(null);

  useEffect(() => {
    setInfo(getState());
    const id = setInterval(() => setInfo(getState()), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = info?.state === "warning" || info?.state === "active";

  return (
    <AnimatePresence>
      {visible && info && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        >
          <div className={`mx-4 sm:mx-auto max-w-xl mt-4 rounded-xl border px-5 py-3 flex items-center justify-between gap-4 backdrop-blur-md shadow-lg ${
            info.state === "active"
              ? "border-red-500/40 bg-red-500/10"
              : "border-yellow-500/40 bg-yellow-500/10"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-lg">{info.state === "active" ? "🔧" : "⚠️"}</span>
              <div>
                <p className={`text-sm font-semibold ${info.state === "active" ? "text-red-300" : "text-yellow-300"}`}>
                  {info.state === "active" ? "Maintenance active" : "Maintenance starting soon"}
                </p>
                <p className="text-white/40 text-xs">
                  {info.state === "active"
                    ? "NAS is offline — services unavailable"
                    : "NAS goes offline at 06:30 for daily backup"}
                </p>
              </div>
            </div>
            <span className={`text-sm font-mono font-bold tabular-nums flex-shrink-0 ${
              info.state === "active" ? "text-red-300" : "text-yellow-300"
            }`}>
              {info.state === "active" ? `~${fmt(info.ms)}` : fmt(info.ms)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
