"use client";

import { useMotionValue, useTransform, useSpring } from "framer-motion";
import { useEffect } from "react";

export function useParallax() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [0, 1], [15, -15]);
  const rotateY = useTransform(x, [0, 1], [-15, 15]);

  const springConfig = { damping: 20, stiffness: 150 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const mouseX = e.clientX / innerWidth;
      const mouseY = e.clientY / innerHeight;
      x.set(mouseX);
      y.set(mouseY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y]);

  return { rotateX, rotateY, smoothX, smoothY };
}