"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AuroraBackground } from "@/components/AuroraBackground";

interface Asset {
  id: string;
  type: string;
  filename: string;
  thumb: string;
  preview: string;
}

export default function PhotosPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const selectedImg = selectedIdx !== null ? assets[selectedIdx]?.preview : null;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((d) => {
        setAssets(d.assets.filter((a: Asset) => a.type === "IMAGE"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedIdx === null) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIdx(null);
      if (e.key === "ArrowRight" && selectedIdx < assets.length - 1) setSelectedIdx(selectedIdx + 1);
      if (e.key === "ArrowLeft" && selectedIdx > 0) setSelectedIdx(selectedIdx - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [selectedIdx, assets.length]);

  return (
    <main className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      <AuroraBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 pointer-events-none">
        <div className="pointer-events-auto mb-8">
          <Link href="/" className="text-white/40 hover:text-white/70 text-sm font-mono transition-colors">
            ← back to mx11.org
          </Link>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-bold text-white mb-10"
        >
          📸 Photo Portfolio
        </motion.h1>

        {loading ? (
          <div className="text-white/20 text-center py-20 font-mono">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {assets.map((asset, i) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all pointer-events-auto"
                onClick={() => setSelectedIdx(i)}
              >
                <img
                  src={asset.thumb}
                  alt={asset.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedIdx !== null && selectedImg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black pointer-events-auto"
              onClick={() => setSelectedIdx(null)}
            >
              <button
                className="absolute top-4 right-4 z-10 text-white/60 hover:text-white text-3xl transition-colors p-2"
                onClick={() => setSelectedIdx(null)}
              >✕</button>

              {selectedIdx > 0 && (
                <button
                  className="absolute left-4 z-10 text-white/60 hover:text-white text-4xl transition-colors p-4"
                  onClick={(e) => { e.stopPropagation(); setSelectedIdx(selectedIdx - 1); }}
                >‹</button>
              )}

              {selectedIdx < assets.length - 1 && (
                <button
                  className="absolute right-4 z-10 text-white/60 hover:text-white text-4xl transition-colors p-4"
                  onClick={(e) => { e.stopPropagation(); setSelectedIdx(selectedIdx + 1); }}
                >›</button>
              )}

              <motion.img
                key={selectedIdx}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.2 }}
                src={selectedImg}
                className="max-w-[90vw] max-h-[90vh] object-contain select-none"
                alt="Preview"
                onClick={(e) => e.stopPropagation()}
              />

              <div className="absolute bottom-4 text-white/40 text-sm font-mono">
                {selectedIdx + 1} / {assets.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </main>
  );
}
