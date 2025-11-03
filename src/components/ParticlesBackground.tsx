"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const generateParticles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100, // horizontal %
    size: Math.random() * 4 + 2, // size in px
    duration: Math.random() * 12 + 8, // animation speed
    delay: Math.random() * 5, // random start
    opacity: Math.random() * 0.5 + 0.2,
  }));
};

export default function ParticlesBackground({ count = 25 }: { count?: number }) {
  const particles = useMemo(() => generateParticles(count), [count]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-blue-400/40 blur-sm"
          style={{
            left: `${p.left}%`,
            bottom: `-${p.size * 4}px`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: ["0%", "-120%"],
            opacity: [p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
