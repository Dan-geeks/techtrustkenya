import { useEffect, useRef, useState } from "react";

const easeOutQuad = (t: number) => t * (2 - t);

/** Counts up from 0 to `value` once scrolled into view, then holds. */
export const CountUp = ({ value, durationMs = 1200 }: { value: number; durationMs?: number }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            setDisplay(Math.round(easeOutQuad(t) * value));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, durationMs]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
};
