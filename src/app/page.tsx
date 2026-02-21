"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/AuroraBackground";
import { TextGenerateEffect } from "@/components/TextGenerateEffect";
import { ServiceCard } from "@/components/ServiceCard";
import Link from "next/link";
import { PanelCard } from "@/components/PanelCard";
import { MaintenanceBanner, MaintenanceIndicator } from "@/components/MaintenanceBanner";

const CATEGORIES = [
  {
    title: "Media & Apps",
    services: [
      { host: "jellyfin.mx11.org", name: "Jellyfin", desc: "Stream movies, shows & music" },
      { host: "immich.mx11.org", name: "Immich", desc: "Photo & video backup" },
    ],
  },
  {
    title: "Games",
    services: [
      { host: "map.mx11.org", name: "Dynmap", desc: "Live world map", tag: "Minecraft" },
    ],
    panels: ["crafty", "pelican"] as const,
  },
];

const INFRA_SERVICES = [
  { host: "tailscale", name: "Tailscale", desc: "VPN tunnel to homelab", label: "100.94.173.108" },
];

type ServiceStatus = { online: boolean; ping: number | null; players?: { current: number; max: number }; history: number[] };
type StatusMap = Record<string, ServiceStatus>;

export default function Home() {
  const [status, setStatus] = useState<StatusMap>({});

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data: StatusMap = await res.json();
      setStatus(data);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <MaintenanceBanner />
      <AuroraBackground />

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {/* Logo SVG inline */}
          <motion.svg
            viewBox="0 0 143.23 66.81"
            xmlns="http://www.w3.org/2000/svg"
            className="w-80 sm:w-96 md:w-[36rem] mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <g>
              <path fill="#fff" d="M0,8.34h14.98l10.8,13.75h.58l10.8-13.75h14.98v43.56h-14.76v-24.19h-.43l-10.51,11.74h-.72l-10.51-11.74h-.43v24.19H0V8.34Z"/>
              <path fill="#fff" d="M86.55,30.09l15.91,21.82h-17.21l-6.98-9.15h-1.01l-6.7,9.15h-18.43l16.56-21.82-16.56-21.75h18.43l6.77,9.22h.94l6.98-9.22h17.21l-15.91,21.75Z"/>
              <path fill="#242a64" d="M114.79,4.5v44.4h-10.85V11.82h-10.01v-7.32h20.86M117.79,1.5h-26.86v13.32h10.01v37.08h16.85V1.5h0Z"/>
              <path fill="#272a63" d="M138.73,4.5v44.4h-10.85V11.82h-10.01v-7.32h20.86M141.73,1.5h-26.86v13.32h10.01v37.08h16.85V1.5h0Z"/>
              <g>
                <path fill="#fff" d="M88.64,61.29h5.14v3.68h-5.14v-3.68Z"/>
                <path fill="#fff" d="M113.17,57.25v7.72h-17.3l5.56-7.72h11.74ZM108.53,62.1v-1.99h-3.78l-1.47,1.99h5.25Z"/>
                <path fill="#fff" d="M119.47,60.26v4.71h-4.94v-7.72h11.28v3.01h-6.33Z"/>
                <path fill="#fff" d="M141.05,57.25v9.55h-11.33v-1.83h-6.56l5.56-7.72h12.33ZM131.91,60.11l-1.58,2.14h4.54l-1.39,1.83h2.94v-3.98h-4.51Z"/>
              </g>
            </g>
          </motion.svg>
          <TextGenerateEffect words="Max's Services" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-white/30 text-sm tracking-widest uppercase"
          >
            scroll down ↓
          </motion.div>
        </motion.div>
      </section>

      {/* Portfolio */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-24 pointer-events-none">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl font-bold text-center mb-10 text-white"
        >
          Portfolio
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5 }}>
            <Link href="/portfolio/photos" className="group block rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden pointer-events-auto transition-colors hover:border-white/[0.15] hover:bg-white/[0.06] p-5">
              <h3 className="text-white font-semibold text-base mb-1">📸 Photo Portfolio</h3>
              <p className="text-white/40 text-sm">Photography showcase</p>
              <p className="text-white/20 text-xs mt-2 font-mono group-hover:text-white/40 transition-colors">click to browse →</p>
            </Link>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Link href="/portfolio/videos" className="group block rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm overflow-hidden pointer-events-auto transition-colors hover:border-white/[0.15] hover:bg-white/[0.06] p-5">
              <h3 className="text-white font-semibold text-base mb-1">🎬 Video Portfolio</h3>
              <p className="text-white/40 text-sm">Videography showcase</p>
              <p className="text-white/20 text-xs mt-2 font-mono group-hover:text-white/40 transition-colors">click to browse →</p>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-24 space-y-20 pointer-events-none">
        {CATEGORIES.map((cat, ci) => {
          const globalOffset = CATEGORIES.slice(0, ci).reduce((a, c) => a + c.services.length, 0);
          return (
            <div key={cat.title}>
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="text-2xl sm:text-3xl font-bold text-center mb-10 text-white"
              >
                {cat.title}
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {cat.services.map((svc, i) => (
                  <ServiceCard
                    key={svc.host}
                    service={svc}
                    status={status[svc.host]}
                    pingHistory={status[svc.host]?.history}
                    index={globalOffset + i}
                  />
                ))}
                {"panels" in cat && (cat as any).panels.map((p: "crafty" | "pelican") => (
                  <PanelCard key={p} panel={p} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* Friends & Partners */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-24 pointer-events-none">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl font-bold text-center mb-10 text-white"
        >
          Friends & Partners
        </motion.h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { name: "Logge", url: "https://lmf.logge.top", host: "lmf.logge.top", icon: "https://lmf.logge.top/images/Logo.png", bright: true },
            { name: "Max", url: "https://buffbolzen.com", host: "buffbolzen.com", emoji: "🛒" },
            { name: "Jonas", url: "https://jb-studio.net", host: "jb-studio.net", icon: "https://jb-studio.net/images/logo-clean.png" },
            { name: "Julian", url: "https://jupeters.de", host: "jupeters.de", icon: "https://jupeters.de/assets/favicon/favicon-192.png" },
            { name: "Kolping Ramsen", url: "https://kolpingtheater-ramsen.de", host: "kolpingtheater-ramsen.de", icon: "https://kolpingtheater-ramsen.de/img/logo.png" },
          ].map((partner, i) => (
            <motion.a
              key={partner.url}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ scale: 1.05, y: -3 }}
              className="pointer-events-auto group block rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-4 text-center transition-colors hover:border-white/[0.15] hover:bg-white/[0.06] relative overflow-hidden"
            >
              {partner.emoji ? (
                <span className="block text-2xl opacity-[0.3] group-hover:opacity-[0.6] transition-opacity mx-auto mb-3">
                  {partner.emoji}
                </span>
              ) : partner.icon && (
                <img
                  src={partner.icon}
                  alt=""
                  className={`w-10 h-10 object-contain grayscale group-hover:opacity-[0.5] transition-opacity mx-auto mb-3 ${partner.bright ? "opacity-[0.5] invert group-hover:opacity-[0.7]" : "opacity-[0.25]"}`}
                />
              )}
              <p className="text-white font-semibold text-sm mb-1">{partner.name}</p>
              <p className="text-white/20 text-xs font-mono">{partner.host}</p>
            </motion.a>
          ))}
        </div>
      </section>

      {/* Network - smaller, separated */}
      <section className="relative z-10 max-w-md mx-auto px-4 pb-16 pointer-events-none">
        <div className="border-t border-white/[0.06] pt-12">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-xs text-white/20 uppercase tracking-[0.3em] text-center mb-6"
          >
            Network
          </motion.p>
          <div className="grid grid-cols-1 gap-4">
            {INFRA_SERVICES.map((svc, i) => (
              <ServiceCard
                key={svc.host}
                service={svc}
                status={status[svc.host]}
                pingHistory={status[svc.host]?.history}
                index={i}
              />
            ))}
            <MaintenanceIndicator />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-10 pointer-events-none">
        <div className="flex justify-center gap-6 mb-4 pointer-events-auto">
          <a href="mailto:info@mx11.org" className="text-white/30 hover:text-white/60 text-sm font-mono transition-colors">
            info@mx11.org
          </a>
          <a href="mailto:max@mx11.org" className="text-white/30 hover:text-white/60 text-sm font-mono transition-colors">
            max@mx11.org
          </a>
          <a href="https://instagram.com/max.htr" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 text-sm font-mono transition-colors">
            @max.htr
          </a>
        </div>
        <p className="text-white/20 text-xs tracking-wider">
          MX11 · {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
