// src/components/ui/ParallaxContainer.tsx
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useParallax } from "@/Hooks/useParallax"; // Change to uppercase H

interface ParallaxContainerProps {
  children: ReactNode;
  intensity?: number;
}

export default function ParallaxContainer({ 
  children, 
  intensity = 10 
}: ParallaxContainerProps) {
  const { rotateX, rotateY } = useParallax();

  return (
    <motion.div
      className="relative w-full h-full"
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      transition={{ type: "spring", stiffness: 150, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}