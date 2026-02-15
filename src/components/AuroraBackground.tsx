"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";

export function AuroraBackground() {
  const rows = 15;
  const cols = 35;
  const containerRef = useRef<HTMLDivElement>(null);
  const [clickedCell, setClickedCell] = useState<[number, number] | null>(null);

  const handleClick = useCallback((row: number, col: number) => {
    setClickedCell([row, col]);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Grid container */}
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          className="grid w-full h-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {Array.from({ length: rows * cols }).map((_, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            return (
              <Cell
                key={`${row}-${col}`}
                row={row}
                col={col}
                clickedCell={clickedCell}
                onClick={handleClick}
              />
            );
          })}
        </div>
      </div>

      {/* Fade overlay - bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, #0a0a0a)",
        }}
      />
      {/* Fade overlay - top */}
      <div
        className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(to top, transparent, #0a0a0a)",
        }}
      />
      {/* Fade overlay - sides */}
      <div
        className="absolute inset-y-0 left-0 w-24 pointer-events-none"
        style={{
          background: "linear-gradient(to left, transparent, #0a0a0a)",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-24 pointer-events-none"
        style={{
          background: "linear-gradient(to right, transparent, #0a0a0a)",
        }}
      />
    </div>
  );
}

function Cell({
  row,
  col,
  clickedCell,
  onClick,
}: {
  row: number;
  col: number;
  clickedCell: [number, number] | null;
  onClick: (row: number, col: number) => void;
}) {
  const controls = useAnimation();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (clickedCell) {
      const distance = Math.sqrt(
        Math.pow(clickedCell[0] - row, 2) + Math.pow(clickedCell[1] - col, 2)
      );
      controls.start({
        opacity: [0, 0.3 - distance * 0.02, 0],
        transition: { duration: 0.5, delay: distance * 0.04 },
      });
    }
  }, [clickedCell, controls, row, col]);

  return (
    <motion.div
      className="border-[0.5px] border-white/[0.04] cursor-pointer"
      animate={controls}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(row, col)}
      style={{
        backgroundColor: isHovered ? "rgba(255,255,255,0.06)" : "transparent",
        transition: "background-color 150ms ease",
      }}
    />
  );
}
