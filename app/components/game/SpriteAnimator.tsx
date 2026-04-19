"use client";

import { useEffect, useMemo, useState } from "react";

type SpriteAnimatorProps = {
  src: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  row?: number;
  playing?: boolean;
  loop?: boolean;
  scale?: number;
  flipX?: boolean;
  className?: string;
};

export function SpriteAnimator({
  src,
  frameWidth,
  frameHeight,
  frames,
  fps,
  row = 0,
  playing = true,
  loop = true,
  scale = 1,
  flipX = false,
  className,
}: SpriteAnimatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!playing || frames <= 1) {
      return;
    }

    const interval = Math.max(40, Math.round(1000 / Math.max(1, fps)));
    const timer = window.setInterval(() => {
      setFrameIndex((previous) => {
        const next = previous + 1;

        if (next >= frames) {
          return loop ? 0 : frames - 1;
        }

        return next;
      });
    }, interval);

    return () => window.clearInterval(timer);
  }, [fps, frames, loop, playing]);

  const transform = useMemo(() => {
    const transforms: string[] = [];
    if (flipX) transforms.push("scaleX(-1)");
    if (scale !== 1) transforms.push(`scale(${scale})`);
    return transforms.join(" ");
  }, [flipX, scale]);

  return (
    <div
      className={className}
      style={{
        width: frameWidth,
        height: frameHeight,
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${frameIndex * frameWidth}px -${row * frameHeight}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        transform,
        transformOrigin: "bottom center",
      }}
    />
  );
}
