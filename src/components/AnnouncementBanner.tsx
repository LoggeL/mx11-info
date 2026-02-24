"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Announcement { message: string; type: "info" | "warning" | "error"; createdAt: number; }

export function AnnouncementBanner() {
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/admin").then(r => r.json()).then(d => setAnn(d.announcement)).catch(() => {});
  }, []);

  const colors = {
    info:    { border: "border-blue-500/40",   bg: "bg-blue-500/10",   text: "text-blue-300",   icon: "ℹ️" },
    warning: { border: "border-yellow-500/40", bg: "bg-yellow-500/10", text: "text-yellow-300", icon: "⚠️" },
    error:   { border: "border-red-500/40",    bg: "bg-red-500/10",    text: "text-red-300",    icon: "🚨" },
  };

  return (
    <AnimatePresence>
      {ann && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        >
          <div className={`mx-4 sm:mx-auto max-w-2xl mt-4 rounded-xl border px-5 py-3 flex items-center gap-4 backdrop-blur-md shadow-lg pointer-events-auto ${colors[ann.type].border} ${colors[ann.type].bg}`}>
            <span className="text-lg flex-shrink-0">{colors[ann.type].icon}</span>
            <p className={`text-sm flex-1 ${colors[ann.type].text}`}>{ann.message}</p>
            <button
              onClick={() => setDismissed(true)}
              className="text-white/30 hover:text-white/60 text-lg leading-none flex-shrink-0 transition-colors"
            >✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
