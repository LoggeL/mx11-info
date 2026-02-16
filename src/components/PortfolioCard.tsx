"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Asset {
  id: string;
  type: string;
  filename: string;
  thumb: string;
  preview: string;
}

export function PortfolioCard({ type }: { type: "photo" | "video" }) {
  const isPhoto = type === "photo";
  const [expanded, setExpanded] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  useEffect(() => {
    if (expanded && isPhoto && assets.length === 0) {
      fetch("/api/portfolio")
        .then((r) => r.json())
        .then((d) => {
          const filtered = d.assets.filter((a: Asset) => a.type === "IMAGE");
          setAssets(filtered);
        })
        .catch(() => {});
    }
  }, [expanded, isPhoto, assets.length]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        onClick={() => isPhoto ? setExpanded(!expanded) : null}
        className={`group relative block rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden pointer-events-auto transition-colors hover:border-white/[0.15] hover:bg-white/[0.06] ${isPhoto ? "cursor-pointer" : ""}`}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold text-base mb-1">
                {isPhoto ? "📸 Photo Portfolio" : "🎬 Video Portfolio"}
              </h3>
              <p className="text-white/40 text-sm">
                {isPhoto ? "Photography showcase" : "Videography showcase"}
              </p>
              {isPhoto && (
                <p className="text-white/20 text-xs mt-2 font-mono">
                  {expanded ? "click to close" : "click to browse"}
                </p>
              )}
              {!isPhoto && (
                <p className="text-white/20 text-xs mt-2 font-mono">coming soon</p>
              )}
            </div>
            {isPhoto && (
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="text-white/30 text-sm mt-1 flex-shrink-0"
              >
                ▼
              </motion.div>
            )}
          </div>
        </div>

        {/* Expanded photo grid */}
        <AnimatePresence>
          {expanded && isPhoto && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5">
                {assets.length === 0 ? (
                  <div className="text-white/20 text-sm text-center py-8">Loading...</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {assets.map((asset) => (
                      <motion.div
                        key={asset.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImg(asset.preview);
                        }}
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-pointer pointer-events-auto"
            onClick={() => setSelectedImg(null)}
          >
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              src={selectedImg}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              alt="Preview"
            />
            <div className="absolute top-6 right-6 text-white/50 text-2xl hover:text-white transition-colors">✕</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
