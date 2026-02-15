"use client";

import { motion } from "framer-motion";

export function TextGenerateEffect({ words }: { words: string }) {
  const chars = words.split("");

  return (
    <div className="text-lg sm:text-xl md:text-2xl font-light tracking-[0.2em] text-white/60 uppercase">
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.4,
            delay: 0.8 + i * 0.03,
            ease: "easeOut",
          }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}
