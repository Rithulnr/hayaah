"use client";

import { useEffect, useRef } from "react";
import { initSmoke, type SmokeController } from "./hayaahSmoke";

type Props = { className?: string };

/**
 * Live WebGL ambient incense smoke overlay.
 * Absolute inside .hayaah-hero, scrolls away naturally with the hero section.
 */
export default function HayaahSmokeOverlay({ className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<SmokeController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const smoke = initSmoke(canvas, {
      sourceX: 0.85,
      sourceY: 0.12,
      intensity: 1.15,
      speed: 0.78,
      quality: window.matchMedia("(max-width: 700px)").matches ? 0.55 : 0.8,
      ember: 0.04,
      scrollFade: false,
      colorDark: [0.36, 0.25, 0.22],
      colorLight: [0.88, 0.76, 0.68],
    });
    if (!smoke) return;
    controllerRef.current = smoke;

    return () => {
      smoke.destroy();
      controllerRef.current = null;
    };
  }, []);

  return (
    <div className={`hayaah-smoke-overlay ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} className="hayaah-smoke-canvas" />
    </div>
  );
}
