import { motion } from 'framer-motion';
import type { Zone } from '../../lib/mapSetApi';
import { parseRiddleWithVariables } from '../../lib/riddleParser';

type RiddleTextProps = {
  text: string;
  zones: Zone[];
};

export default function RiddleText({ text, zones }: RiddleTextProps) {
  const segments = parseRiddleWithVariables(text, zones);

  return (
    <p className="mt-1 text-sm text-white/88">
      {segments.map((segment, index) => {
        if (segment.type !== 'variable') {
          return <span key={`txt-${index}`}>{segment.content}</span>;
        }

        const color = segment.color || '#f59e0b';
        return (
          <motion.span
            key={`var-${index}`}
            className="inline-block font-semibold"
            style={{ color }}
            animate={{
              scale: [1, 1.04, 1],
              opacity: [0.84, 1, 0.84],
              textShadow: [`0 0 3px ${color}80`, `0 0 11px ${color}cc`, `0 0 3px ${color}80`],
            }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          >
            {segment.content}
          </motion.span>
        );
      })}
    </p>
  );
}
