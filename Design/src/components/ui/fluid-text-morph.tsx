import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FluidTextMorphProps {
  wordPairs: [string, string][];
  className?: string;
  animationProps?: {
    initialColor?: string;
    animateColor?: string;
    exitColor?: string;
    enterDelayStep?: number;
    exitDelayStep?: number;
    stiffness?: number;
    damping?: number;
  };
  /** When true, shows the second word in each pair */
  active?: boolean;
  /** Called when pair index changes */
  onIndexChange?: (index: number) => void;
}

export function FluidTextMorph({
  wordPairs,
  className,
  animationProps = {},
  active = false,
  onIndexChange,
}: FluidTextMorphProps) {
  const [index, setIndex] = useState(0);
  const [word, setWord] = useState(wordPairs[index][0]);

  const {
    initialColor = "rgba(255,255,255,0.3)",
    animateColor = "rgba(255,255,255,0.95)",
    exitColor = "rgba(245,130,32,0.5)",
    enterDelayStep = 0.04,
    exitDelayStep = 0.04,
    stiffness = 200,
    damping = 15,
  } = animationProps;

  useEffect(() => {
    setWord(active ? wordPairs[index][1] : wordPairs[index][0]);
  }, [index, active, wordPairs]);

  const handleClick = () => {
    const next = (index + 1) % wordPairs.length;
    setIndex(next);
    onIndexChange?.(next);
  };

  const letters = word.split("");

  return (
    <div
      className={cn(
        "relative flex cursor-pointer items-center justify-center font-bold",
        className
      )}
      onClick={handleClick}
    >
      <AnimatePresence mode="popLayout">
        {letters.map((letter, i) => (
          <motion.span
            key={`${word}-${i}`}
            layoutId={`letter-${i}`}
            initial={{ opacity: 0, y: 20, scale: 0.8, color: initialColor }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              color: animateColor,
              transition: {
                type: "spring",
                damping,
                stiffness,
                delay: i * enterDelayStep,
              },
            }}
            exit={{
              opacity: 0,
              y: -20,
              scale: 0.8,
              color: exitColor,
              transition: {
                type: "spring",
                damping,
                stiffness,
                delay: (letters.length - 1 - i) * exitDelayStep,
              },
            }}
            className="relative inline-block"
            style={{ minWidth: letter === " " ? "0.3em" : undefined }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
