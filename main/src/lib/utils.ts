import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ACTIONS = ['Seek', 'Awaken', 'Channel', 'Summon', 'Hear'] as const;
const DESCRIPTORS = ['Abyssal', 'Astral', 'Sunken', 'Silent', 'Cosmic'] as const;
const DOMAINS = ['Nebula', 'Tide', 'Void', 'Ocean', 'Reef'] as const;
const PREPOSITIONS = ['Beyond', 'Beneath', 'Within', 'Across', 'Through'] as const;
const ANCHORS = ['Stars', 'Waves', 'Shadows', 'Time', 'Light'] as const;

const pick = <T extends readonly string[]>(values: T): string => {
  const index = Math.floor(Math.random() * values.length);
  return values[index];
};

export function generateMantraPhrase(): string {
  return [
    pick(ACTIONS),
    pick(DESCRIPTORS),
    pick(DOMAINS),
    pick(PREPOSITIONS),
    pick(ANCHORS),
  ].join(' ');
}
