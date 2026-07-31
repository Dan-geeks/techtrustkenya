import { useEffect, useRef, useState } from "react";

/**
 * Tracks how far a (typically tall) section has scrolled through the
 * viewport, as 0→1. 0 = section just entered from the bottom, 1 = section
 * has fully scrolled past the top. Meant for scroll-scrubbed effects on a
 * sticky child (e.g. a pinned image that animates as you scroll the section).
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const compute = () => {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const total = rect.height + window.innerHeight;
        const p = (window.innerHeight - rect.top) / total;
        setProgress(Math.min(1, Math.max(0, p)));
      }
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progress };
}
