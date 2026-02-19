"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Asset {
  id: string;
  type: string;
  filename: string;
  thumb: string;
  preview: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
}

export function PortfolioCard({ type }: { type: "photo" | "video" }) {
  const isPhoto = type === "photo";
  const [expanded, setExpanded] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const selectedImg = selectedIdx !== null ? assets[selectedIdx]?.preview : null;

  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll + keyboard nav when lightbox open
  useEffect(() => {
    if (selectedIdx === null && !selectedVideo) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIdx(null);
        setSelectedVideo(null);
      }
      if (selectedIdx !== null) {
        if (e.key === "ArrowRight" && selectedIdx < assets.length - 1) setSelectedIdx(selectedIdx + 1);
        if (e.key === "ArrowLeft" && selectedIdx > 0) setSelectedIdx(selectedIdx - 1);
      }
      if (selectedVideo) {
        const currentVidIdx = videos.findIndex(v => v.id === selectedVideo);
        if (e.key === "ArrowRight" && currentVidIdx < videos.length - 1) setSelectedVideo(videos[currentVidIdx + 1].id);
        if (e.key === "ArrowLeft" && currentVidIdx > 0) setSelectedVideo(videos[currentVidIdx - 1].id);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [selectedIdx, selectedVideo, assets.length, videos]);

  // Fetch photos
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

  // Fetch videos
  useEffect(() => {
    if (expanded && !isPhoto && videos.length === 0) {
      fetch("/api/videos")
        .then((r) => r.json())
        .then((d) => setVideos(d.videos || []))
        .catch(() => {});
    }
  }, [expanded, isPhoto, videos.length]);

  const currentVidIdx = selectedVideo ? videos.findIndex(v => v.id === selectedVideo) : -1;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5 }}
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="group relative block rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden pointer-events-auto transition-colors hover:border-white/[0.15] hover:bg-white/[0.06] cursor-pointer"
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
              <p className="text-white/20 text-xs mt-2 font-mono">
                {expanded ? "click to close" : "click to browse"}
              </p>
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-white/30 text-sm mt-1 flex-shrink-0"
            >
              ▼
            </motion.div>
          </div>
        </div>

        {/* Expanded grid */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5">
                {isPhoto ? (
                  // Photo grid
                  assets.length === 0 ? (
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
                            setSelectedIdx(assets.indexOf(asset));
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
                  )
                ) : (
                  // Video grid
                  videos.length === 0 ? (
                    <div className="text-white/20 text-sm text-center py-8">Loading...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videos.map((video) => (
                        <motion.div
                          key={video.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          className="rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all group/vid"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVideo(video.id);
                          }}
                        >
                          <div className="relative aspect-video">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {/* Play button overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/vid:bg-black/50 transition-colors">
                              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-black border-b-[8px] border-b-transparent ml-1" />
                              </div>
                            </div>
                          </div>
                          <div className="p-2 bg-white/[0.03]">
                            <p className="text-white/70 text-xs truncate">{video.title}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Photo Lightbox */}
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
                  className="absolute right-4 z-10 text-white/60 hover:text-white text-4xl transition-colors p-4 mr-8"
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

      {/* Video Lightbox */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black pointer-events-auto"
              onClick={() => setSelectedVideo(null)}
            >
              <button
                className="absolute top-4 right-4 z-10 text-white/60 hover:text-white text-3xl transition-colors p-2"
                onClick={() => setSelectedVideo(null)}
              >✕</button>

              {currentVidIdx > 0 && (
                <button
                  className="absolute left-4 z-10 text-white/60 hover:text-white text-4xl transition-colors p-4"
                  onClick={(e) => { e.stopPropagation(); setSelectedVideo(videos[currentVidIdx - 1].id); }}
                >‹</button>
              )}

              {currentVidIdx < videos.length - 1 && (
                <button
                  className="absolute right-4 z-10 text-white/60 hover:text-white text-4xl transition-colors p-4 mr-8"
                  onClick={(e) => { e.stopPropagation(); setSelectedVideo(videos[currentVidIdx + 1].id); }}
                >›</button>
              )}

              <div className="w-[90vw] max-w-5xl aspect-video" onClick={(e) => e.stopPropagation()}>
                <iframe
                  key={selectedVideo}
                  src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1&rel=0`}
                  className="w-full h-full rounded-lg"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />
              </div>

              <div className="absolute bottom-4 text-white/40 text-sm font-mono">
                {currentVidIdx + 1} / {videos.length}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
