"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/AuroraBackground";
import { TextGenerateEffect } from "@/components/TextGenerateEffect";
import { ServiceCard } from "@/components/ServiceCard";

const SERVICES = [
  { host: "immich.mx11.org", name: "Photos", desc: "Self-hosted photo & video backup" },
  { host: "map.mx11.org", name: "Map", desc: "Interactive mapping service" },
  { host: "crafty.mx11.org", name: "Game Server Manager", desc: "Manage game servers with ease" },
  { host: "jellyfin.mx11.org", name: "Media Server", desc: "Stream movies, shows & music" },
  { host: "bedrock.mx11.org", name: "Minecraft Bedrock", desc: "Bedrock Edition server" },
  { host: "create.mx11.org", name: "Create", desc: "Creative tools & workspace" },
  { host: "java.mx11.org", name: "Minecraft Java", desc: "Java Edition server" },
  { host: "modpack.mx11.org", name: "Modpack", desc: "Minecraft modpack distribution" },
  { host: "mx11.org", name: "Main", desc: "Main website" },
];

type StatusMap = Record<string, boolean>;

export default function Home() {
  const [status, setStatus] = useState<StatusMap>({});

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
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
      <AuroraBackground />

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
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
            className="w-64 sm:w-80 md:w-[28rem] mb-8"
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
          <TextGenerateEffect words="Infrastructure & Services" />
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

      {/* Services */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pb-24">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl font-bold text-center mb-16 text-white"
        >
          Services
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((svc, i) => (
            <ServiceCard
              key={svc.host}
              service={svc}
              online={status[svc.host]}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center py-8 text-white/20 text-xs tracking-wider">
        MX11 · {new Date().getFullYear()}
      </footer>
    </main>
  );
}
