"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

const groupVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.04,
      staggerChildren: 0.065,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
  },
};

type MotionGroupProps = Readonly<{
  children: ReactNode;
  className?: string;
  delay?: number;
}>;

export function AnimatedGroup({ children, className, delay = 0 }: MotionGroupProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={groupVariants}
      initial={reducedMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08, margin: "0px 0px -5% 0px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({ children, className }: Omit<MotionGroupProps, "delay">) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={reducedMotion ? undefined : itemVariants}
    >
      {children}
    </motion.div>
  );
}
