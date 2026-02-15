"use client";

import { motion } from "framer-motion";

interface Props {
  service: { host: string; name: string; desc: string };
  online?: boolean;
  index: number;
}

export function ServiceCard({ service, online, index }: Props) {
  const isLoading = online === undefined;

  return (
    <motion.a
      href={`https://${service.host}`}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className="group relative block rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-5 transition-colors hover:border-white/[0.15] hover:bg-white/[0.06]"
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-dark/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-semibold text-base mb-1 truncate">
            {service.name}
          </h3>
          <p className="text-white/40 text-sm leading-relaxed">{service.desc}</p>
          <p className="text-white/20 text-xs mt-2 font-mono truncate">
            {service.host}
          </p>
        </div>

        {/* Status dot */}
        <div className="flex-shrink-0 mt-1">
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
        </div>
      </div>
    </motion.a>
  );
}
