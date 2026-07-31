import { useScrollProgress } from "@/hooks/useScrollProgress";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Remaps `v` from [inMin,inMax] to [0,1], clamped. */
const band = (v: number, inMin: number, inMax: number) => clamp01((v - inMin) / (inMax - inMin));

/**
 * A tall scroll-scrubbed section: the laptop sits open while the section is
 * "held" in the middle of the scroll range, then the lid swings shut (pure
 * CSS 3D transform on one photo — there's no real closing footage) as the
 * user keeps scrolling. transform-origin: bottom mimics a hinge.
 */
export const ClosingShowcase = () => {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();

  const closeAmount = band(progress, 0.55, 0.92); // 0 while open, 1 once shut
  const introAmount = band(progress, 0, 0.18); // fade/scale in on arrival

  const rotateX = -closeAmount * 78;
  const scale = 1 - closeAmount * 0.1 - (1 - introAmount) * 0.05;
  const imageOpacity = introAmount * (1 - band(progress, 0.9, 1));

  const headlineOpacity = band(progress, 0.05, 0.2) * (1 - band(progress, 0.45, 0.6));
  const closingLineOpacity = band(progress, 0.62, 0.78) * (1 - band(progress, 0.92, 1));

  return (
    <section ref={ref} className="relative bg-primary" style={{ height: "260vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 grid place-items-center px-4">
          <p
            className="pointer-events-none absolute top-[14%] max-w-lg text-balance text-center text-2xl font-bold text-primary-foreground md:text-4xl"
            style={{ opacity: headlineOpacity }}
          >
            Every listing inspected before it ever reaches you.
          </p>

          <div style={{ perspective: "1800px" }} className="w-full max-w-xl">
            <div
              className="w-full rounded-2xl shadow-2xl shadow-black/40"
              style={{
                transform: `rotateX(${rotateX}deg) scale(${scale})`,
                transformOrigin: "bottom center",
                opacity: imageOpacity,
                willChange: "transform, opacity",
              }}
            >
              <img
                src="/sony-laptop.jpg"
                alt="Laptop listing, verified and ready for handover"
                className="w-full rounded-2xl"
                loading="lazy"
              />
            </div>
          </div>

          <p
            className="pointer-events-none absolute bottom-[16%] max-w-md text-balance text-center text-lg font-semibold text-accent md:text-2xl"
            style={{ opacity: closingLineOpacity }}
          >
            Deal closed. Payment released. Zero risk.
          </p>
        </div>
      </div>
    </section>
  );
};
