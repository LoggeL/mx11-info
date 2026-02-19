"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CraftyServer {
  id: string;
  name: string;
  running: boolean;
  players: number;
  maxPlayers: number;
  cpu: number;
  ram: string;
  address?: string;
  version?: string;
}

interface PelicanServer {
  id: string;
  name: string;
  node: string;
  status: string;
  running?: boolean;
  cpu?: number;
  ram?: string | null;
  uptime?: number;
  maxPlayers?: number | null;
  address?: string | null;
  map?: string | null;
  memoryLimit?: number | null;
  cpuLimit?: number | null;
}

interface PanelData {
  pelican: PelicanServer[];
  crafty: CraftyServer[];
}

export function PanelCard({ panel }: { panel: "crafty" | "pelican" }) {
  const isCrafty = panel === "crafty";
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyAddress = (id: string, address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    if (!expanded || data) return;
    setLoading(true);
    fetch("/api/panel-status")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [expanded, data]);

  const servers = isCrafty ? (data?.crafty ?? []) : (data?.pelican ?? []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      onClick={() => setExpanded(!expanded)}
      className="group relative block rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden pointer-events-auto transition-colors hover:border-white/[0.15] hover:bg-white/[0.06] cursor-pointer"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-white font-semibold text-base mb-1">
              {isCrafty ? "Crafty" : "Pelican"}
            </h3>
            <p className="text-white/40 text-sm">
              {isCrafty ? "Server management panel" : "Game server management"}
            </p>
            <p className="text-white/20 text-xs mt-2 font-mono">
              {expanded ? "click to close" : "click to view servers"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            {!expanded && data && (
              <span className="text-white/30 text-xs font-mono">
                {servers.length} server{servers.length !== 1 ? "s" : ""}
              </span>
            )}
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-white/30 text-sm"
            >▼</motion.div>
          </div>
        </div>
      </div>

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
              {loading ? (
                <div className="text-white/20 text-sm text-center py-4 font-mono">Loading...</div>
              ) : servers.length === 0 ? (
                <div className="text-white/20 text-sm text-center py-4 font-mono">No servers found</div>
              ) : (
                <div className="space-y-2">
                  {isCrafty
                    ? (servers as CraftyServer[]).map((s) => (
                        <div key={s.id} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.running ? "bg-emerald-400" : "bg-red-400/60"}`} />
                              <span className="text-white/80 text-sm font-medium truncate">{s.name}</span>
                              {s.version && <span className="text-white/20 text-xs font-mono flex-shrink-0">{s.version}</span>}
                            </div>
                            <div className="flex flex-wrap gap-3 mt-1 ml-3.5">
                              {s.address && (
                                <span
                                  className="text-white/30 text-xs font-mono cursor-pointer hover:text-white/60 transition-colors"
                                  onClick={(e) => copyAddress(s.id, s.address!, e)}
                                >
                                  {copiedId === s.id ? "✓ copied" : s.address}
                                </span>
                              )}
                              {s.running && (
                                <>
                                  <span className="text-white/30 text-xs font-mono">{s.players}/{s.maxPlayers} players</span>
                                  <span className="text-white/30 text-xs font-mono">CPU {s.cpu.toFixed(1)}%</span>
                                  <span className="text-white/30 text-xs font-mono">RAM {s.ram}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-mono flex-shrink-0 ${s.running ? "text-emerald-400/60" : "text-red-400/40"}`}>
                            {s.running ? "online" : "offline"}
                          </span>
                        </div>
                      ))
                    : (servers as PelicanServer[]).map((s) => {
                        const isActive = s.running ?? s.status === "running";
                        const isSuspended = s.status === "suspended";
                        return (
                          <div key={s.id} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-emerald-400" : isSuspended ? "bg-yellow-400/60" : "bg-white/20"}`} />
                                <span className="text-white/80 text-sm font-medium truncate">{s.name}</span>
                              </div>
                              <span className={`text-xs font-mono flex-shrink-0 ${isActive ? "text-emerald-400/60" : isSuspended ? "text-yellow-400/40" : "text-red-400/40"}`}>
                                {isActive ? "online" : isSuspended ? "suspended" : s.status === "unknown" ? "unknown" : "offline"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-1.5 ml-3.5">
                              <span className="text-white/20 text-xs font-mono">{s.node}</span>
                              {s.address && (
                                <span
                                  className="text-white/30 text-xs font-mono cursor-pointer hover:text-white/60 transition-colors"
                                  onClick={(e) => copyAddress(s.id, s.address!, e)}
                                >
                                  {copiedId === s.id ? "✓ copied" : s.address}
                                </span>
                              )}
                              {s.maxPlayers != null && (
                                <span className="text-white/30 text-xs font-mono">max {s.maxPlayers} players</span>
                              )}
                              {s.map && (
                                <span className="text-white/20 text-xs font-mono capitalize">{s.map}</span>
                              )}
                              {isActive && s.cpu != null && (
                                <span className="text-white/30 text-xs font-mono">CPU {s.cpu.toFixed(1)}%</span>
                              )}
                              {isActive && s.ram && (
                                <span className="text-white/30 text-xs font-mono">RAM {s.ram}</span>
                              )}
                              {!isActive && s.memoryLimit != null && (
                                <span className="text-white/20 text-xs font-mono">{s.memoryLimit >= 1024 ? `${(s.memoryLimit / 1024).toFixed(0)}GB` : `${s.memoryLimit}MB`} RAM limit</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
