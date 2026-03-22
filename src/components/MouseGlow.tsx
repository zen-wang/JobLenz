"use client";

import { useEffect } from "react";

/**
 * Tracks mouse position on all .glass-card elements,
 * setting --mouse-x / --mouse-y CSS vars for the radial glow pseudo-element.
 */
export default function MouseGlow() {
  useEffect(() => {
    function handleMove(e: MouseEvent) {
      const cards = document.querySelectorAll<HTMLElement>(".glass-card");
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      }
    }

    document.addEventListener("mousemove", handleMove);
    return () => document.removeEventListener("mousemove", handleMove);
  }, []);

  return null;
}
