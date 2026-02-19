"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type ServiceStatus = { online: boolean; ping: number | null; players?: { current: number; max: number }; history: number[] };

interface Props {
  service: { host: string; name: string; desc: string; copy?: string; label?: string; tag?: string };
  status?: ServiceStatus;
  pingHistory?: number[];
  index: number;
}

function MiniSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const h = 20;
  const w = 50;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${i * step},${h - (p / max) * h * 0.7 - h * 0.15}`)
    .join(" ");
  const area = `${d} L${(points.length - 1) * step},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-12 h-5">
      <defs>
        <linearGradient id="msFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#msFill)" />
      <path d={d} fill="none" stroke="#34d399" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />
    </svg>
  );
}

export function ServiceCard({ service, status, pingHistory, index }: Props) {
  const isLoading = status === undefined;
  const online = status?.online;
  const players = status?.players ?? null;
  const ping = status?.ping ?? null;
  const [copied, setCopied] = useState(false);

  const borderClass = !isLoading && !online
    ? "border-red-500/30 hover:border-red-500/50"
    : "border-white/[0.08] hover:border-white/[0.15]";

  const handleClick = (e: React.MouseEvent) => {
    if (service.copy) {
      e.preventDefault();
      navigator.clipboard.writeText(service.copy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  return (
    <motion.a
      href={service.copy ? "#" : service.label ? undefined : `https://${service.host}`}
      target={service.copy || service.label ? undefined : "_blank"}
      rel={service.copy || service.label ? undefined : "noopener noreferrer"}
      onClick={handleClick}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className={`group relative block rounded-xl border bg-white/[0.03] backdrop-blur-sm p-5 transition-colors hover:bg-white/[0.06] overflow-hidden pointer-events-auto ${borderClass}`}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-semibold text-base truncate">{service.name}</h3>
            {service.tag && (
              <span className="flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-white/40 border border-white/[0.08]">
                {service.tag}
              </span>
            )}
          </div>
          <p className="text-white/40 text-sm leading-relaxed">{service.desc}</p>
          {players && online && (
            <p className="text-emerald-400/70 text-xs mt-1 font-mono">
              {players.current}/{players.max} players
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <p className="text-white/20 text-xs font-mono truncate">
              {service.label || service.host}
            </p>
            {ping !== null && online && (
              <p className="text-white/30 text-xs font-mono flex-shrink-0">
                {ping}ms
              </p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 mt-1 flex flex-col items-end gap-2">
          {isLoading ? (
            <div className="w-2.5 h-2.5 rounded-full bg-white/20 animate-pulse" />
          ) : (
            <div className="relative">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  online ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              {online && (
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-30" />
              )}
            </div>
          )}
          {service.copy && (
            <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors">
              {copied ? "✓ copied" : "click to copy"}
            </span>
          )}
        </div>
      </div>

      {/* Mini sparkline bottom-right */}
      {pingHistory && pingHistory.length > 1 && online && (
        <div className="absolute bottom-2 right-3 opacity-60">
          <MiniSparkline points={pingHistory} />
        </div>
      )}
    </motion.a>
  );
}
