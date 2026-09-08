"use client";

import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { money } from "@/lib/format";

export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
  gap = 0.07,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap } },
      }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/**
 * Counts up to `value` when it scrolls into view.
 *
 * The tween writes straight to the DOM node instead of going through state: at
 * 60fps a `setState` per frame would re-render this component — and anything
 * that renders alongside it — roughly seventy times per number.
 */
export function AnimatedNumber({
  value,
  currency,
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  const format = (n: number) =>
    currency ? money(n, currency) : Math.round(n).toLocaleString();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect a reduced-motion preference by showing the final value outright.
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!inView || reduceMotion) {
      node.textContent = format(inView ? value : 0);
      return;
    }

    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, currency]);

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {format(0)}
    </span>
  );
}
