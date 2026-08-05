import { useEffect, useRef } from "react";
import { toast } from "sonner";

export const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * A tab left open across a deploy keeps running the old bundle indefinitely:
 * the hashed /assets/* files are `immutable` and index.html is only re-fetched
 * on a real page load. That is how a client reported a hardcoded-cart bug that
 * had already been fixed and deployed the day before - their tab was simply
 * older than the fix.
 *
 * This polls the build id written beside index.html and offers a reload once it
 * stops matching the id compiled into the running bundle. It checks on mount,
 * whenever the tab regains focus, and every few minutes.
 */
export const NewVersionWatcher = () => {
  const notified = useRef(false);

  useEffect(() => {
    // Dev rebuilds constantly and HMR already handles it.
    if (!import.meta.env.PROD) return;

    const check = async () => {
      if (notified.current || document.hidden) return;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const { buildId } = await res.json();
        // An absent id means an older deploy that predates version.json; there
        // is nothing to compare against, so stay quiet rather than nag.
        if (!buildId || buildId === __BUILD_ID__) return;

        notified.current = true;
        toast("A new version of TechTrust is available", {
          id: "new-version",
          description: "Reload to pick up the latest fixes.",
          duration: Infinity,
          action: { label: "Reload", onClick: () => window.location.reload() },
        });
      } catch {
        // Offline or a transient blip - the next tick tries again.
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), VERSION_CHECK_INTERVAL_MS);
    const onWake = () => void check();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  return null;
};

export default NewVersionWatcher;
