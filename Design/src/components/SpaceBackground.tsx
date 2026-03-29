import { useMemo } from "react";

type AshParticle = {
  id: number;
  left: string;
  top: string;
  size: number;
  opacity: number;
  blur: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  tint: "warm" | "cool";
  variant: 1 | 2 | 3;
};

type BlinkStar = {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

const PARTICLE_COUNT = 22;
const STAR_COUNT = 28;

export default function SpaceBackground() {
  const ashes = useMemo<AshParticle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, id) => ({
        id,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Number((Math.random() * 3.6 + 1.4).toFixed(2)),
        opacity: Number((Math.random() * 0.32 + 0.08).toFixed(2)),
        blur: Number((Math.random() * 10 + 4).toFixed(2)),
        duration: Number((Math.random() * 12 + 16).toFixed(2)),
        delay: Number((Math.random() * -18).toFixed(2)),
        driftX: Number((Math.random() * 120 - 60).toFixed(2)),
        driftY: Number((Math.random() * 180 + 100).toFixed(2)),
        tint: Math.random() > 0.76 ? "warm" : "cool",
        variant: ((id % 3) + 1) as 1 | 2 | 3,
      })),
    [],
  );
  const stars = useMemo<BlinkStar[]>(
    () =>
      Array.from({ length: STAR_COUNT }, (_, id) => ({
        id,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Number((Math.random() * 1.9 + 0.8).toFixed(2)),
        delay: Number((Math.random() * -8).toFixed(2)),
        duration: Number((Math.random() * 4.8 + 3.4).toFixed(2)),
        opacity: Number((Math.random() * 0.5 + 0.22).toFixed(2)),
      })),
    [],
  );

  return (
    <>
      <div className="scene" aria-hidden="true">
        <div className="scene__aurora scene__aurora--1" />
        <div className="scene__aurora scene__aurora--2" />
        <div className="scene__aurora scene__aurora--3" />
        <div className="scene__blob scene__blob--1" />
        <div className="scene__blob scene__blob--2" />
        <div className="scene__blob scene__blob--3" />
        <div className="scene__blob scene__blob--4" />

        <div className="star-field">
          {stars.map((star) => (
            <span
              key={star.id}
              className="star-blink"
              style={{
                left: star.left,
                top: star.top,
                width: `${star.size}px`,
                height: `${star.size}px`,
                opacity: star.opacity,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="ash-field">
          {ashes.map((ash) => {
            const glowColor =
              ash.tint === "warm"
                ? `rgba(255, 210, 150, ${ash.opacity})`
                : `rgba(226, 234, 255, ${ash.opacity})`;
            const coreColor =
              ash.tint === "warm"
                ? `rgba(255, 232, 194, ${Math.min(0.92, ash.opacity + 0.22)})`
                : `rgba(236, 241, 255, ${Math.min(0.9, ash.opacity + 0.2)})`;

            return (
              <span
                key={ash.id}
                className={`ash-particle ash-particle--${ash.variant}`}
                style={{
                  left: ash.left,
                  top: ash.top,
                  width: `${ash.size}px`,
                  height: `${ash.size}px`,
                  opacity: ash.opacity,
                  filter: `blur(${ash.blur}px)`,
                  animationDuration: `${ash.duration}s, ${Math.max(3.4, ash.duration * 0.28)}s`,
                  animationDelay: `${ash.delay}s, ${ash.delay * 0.32}s`,
                  ["--ash-drift-x" as string]: `${ash.driftX}px`,
                  ["--ash-drift-y" as string]: `${ash.driftY}px`,
                  background: `radial-gradient(circle, ${coreColor} 0%, ${glowColor} 48%, transparent 100%)`,
                  boxShadow: `0 0 ${Math.max(6, ash.blur * 2)}px ${glowColor}`,
                }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
