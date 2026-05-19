"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform
} from "framer-motion";
import type { MotionProps, Variants } from "framer-motion";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

type WithChildren = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const easeOut = [0.22, 1, 0.36, 1] as const;

export function FadeIn({
  children,
  delay = 0,
  className = ""
}: WithChildren & { delay?: number }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.9, ease: easeOut, delay }}
    >
      {children}
    </motion.div>
  );
}

export function SoftFloat({ children, className = "" }: WithChildren) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      animate={
        prefersReducedMotion
          ? undefined
          : {
              y: [0, -8, 0],
              rotate: [0, -0.35, 0.2, 0]
            }
      }
      transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

export function SlowHover({ children, className = "" }: WithChildren) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      whileHover={prefersReducedMotion ? undefined : { y: -4, transition: { duration: 0.8 } }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 }
  }
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } }
};

export function Stagger({ children, className = "" }: WithChildren) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial={prefersReducedMotion ? false : "hidden"}
      whileInView={prefersReducedMotion ? undefined : "show"}
      viewport={{ once: true, margin: "-8%" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "", style }: WithChildren) {
  return (
    <motion.div className={className} style={style} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

type MagneticCardProps = WithChildren & MotionProps & {
  intensity?: number;
};

export function MagneticCard({
  children,
  className = "",
  intensity = 8,
  ...rest
}: MagneticCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { stiffness: 140, damping: 18, mass: 0.6 };
  const sx = useSpring(x, springConfig);
  const sy = useSpring(y, springConfig);
  const rotateX = useTransform(sy, [-1, 1], [intensity / 2, -intensity / 2]);
  const rotateY = useTransform(sx, [-1, 1], [-intensity / 2, intensity / 2]);
  const transform = useMotionTemplate`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  function onMove(event: MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const fx = (event.clientX - rect.left) / rect.width;
    const fy = (event.clientY - rect.top) / rect.height;
    x.set(fx * 2 - 1);
    y.set(fy * 2 - 1);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      {...rest}
      className={className}
      style={prefersReducedMotion ? undefined : { transform, willChange: "transform" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  delay = 0,
  className = ""
}: WithChildren & { delay?: number }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0, filter: "blur(8px)", y: 24 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, filter: "blur(0px)", y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 1.1, ease: easeOut, delay }}
    >
      {children}
    </motion.div>
  );
}
