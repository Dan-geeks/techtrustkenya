import { cn } from "@/lib/utils";

/**
 * Animated SVG illustrations (SMIL) exported from LottieFiles.
 * They self-animate as plain <img>, so no player library is needed.
 * Paths go through BASE_URL because the app is served from a sub-path.
 */
export const art = {
  marketplace: "animations/hero-marketplace.svg",
  escrow: "animations/escrow-analyst.svg",
  steps: "animations/how-it-works.svg",
  repairs: "animations/repairs-dev.svg",
} as const;

interface AnimatedArtProps {
  /** Key from `art`, e.g. art.marketplace */
  src: string;
  /** Describe the scene, or pass "" when the art is purely decorative. */
  alt: string;
  className?: string;
  eager?: boolean;
}

export const AnimatedArt = ({ src, alt, className, eager }: AnimatedArtProps) => (
  <img
    src={`${import.meta.env.BASE_URL}${src}`}
    alt={alt}
    aria-hidden={alt === "" || undefined}
    loading={eager ? "eager" : "lazy"}
    decoding="async"
    draggable={false}
    className={cn("h-auto w-full select-none", className)}
  />
);
