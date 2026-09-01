"use client";

import { motion } from "framer-motion";

export function Logo({ size = 34, spin = true }: { size?: number; spin?: boolean }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      initial={{ rotate: -8, opacity: 0, scale: 0.8 }}
      animate={{ rotate: 0, opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 14 }}
      whileHover={spin ? { rotate: 120 } : undefined}
      style={{ filter: "drop-shadow(0 4px 12px rgba(109,75,255,0.30))" }}
    >
      {/* three interlocking circles = Circle of Three */}
      <circle cx="24" cy="15" r="9.5" stroke="#6d4bff" strokeWidth="2.4" opacity="0.95" />
      <circle cx="15.5" cy="30" r="9.5" stroke="#6d4bff" strokeWidth="2.4" opacity="0.75" />
      <circle cx="32.5" cy="30" r="9.5" stroke="#6d4bff" strokeWidth="2.4" opacity="0.55" />
      <circle cx="24" cy="24" r="2.6" fill="#6d4bff" />
    </motion.svg>
  );
}

export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo size={size} />
      <div className="leading-none">
        <div className="font-display text-[15px] font-semibold tracking-tight text-fg">
          Circle of Three
        </div>
        <div className="text-[10px] uppercase tracking-[0.28em] text-fg-dim">
          Technologies
        </div>
      </div>
    </div>
  );
}
