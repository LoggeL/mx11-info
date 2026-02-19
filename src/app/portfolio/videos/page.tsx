"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AuroraBackground } from "@/components/AuroraBackground";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const currentVidIdx = selectedVideo ? videos.findIndex(v => v.id === selectedVideo) : -1;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((d) => {
        setVideos(d.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedVideo) return;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedVideo(null);
      const idx = videos.findIndex(v => v.id === selectedVideo);
      if (e.key === "ArrowRight" && idx < videos.length - 1) setSelectedVideo(videos[idx + 1].id);
      if (e.key === "ArrowLeft" && idx > 0) setSelectedVideo(videos[idx - 1].id);
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [selectedVideo, videos]);

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
          🎬 Video Portfolio
        </motion.h1>

        {loading ? (
          <div className="text-white/20 text-center py-20 font-mono">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all pointer-events-auto border border-white/[0.08] bg-white/[0.03]"
                onClick={() => setSelectedVideo(video.id)}
              >
                <div className="relative aspect-video">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-black border-b-[10px] border-b-transparent ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-white/80 text-sm font-medium truncate">{video.title}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

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
                  className="absolute right-4 z-10 text-white/60 hover:text-white text-4xl transition-colors p-4"
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
    </main>
  );
}
