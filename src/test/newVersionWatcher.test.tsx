import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * A tab open across a deploy runs the old bundle forever - that is why a client
 * reported an already-fixed hardcoded cart. The watcher must notice the new
 * build id and offer a reload.
 */
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

vi.stubGlobal("__BUILD_ID__", "old-build");

import { NewVersionWatcher } from "../components/NewVersionWatcher";

const mockVersion = (body: unknown, ok = true) =>
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, json: async () => body }),
  );

describe("NewVersionWatcher (stale tab after a deploy)", () => {
  beforeEach(() => {
    toast.mockClear();
    vi.stubEnv("PROD", true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubGlobal("__BUILD_ID__", "old-build");
  });

  it("offers a reload when the deployed build id has moved on", async () => {
    mockVersion({ buildId: "new-build" });
    render(<NewVersionWatcher />);

    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    const [message, opts] = toast.mock.calls[0];
    expect(message).toMatch(/new version/i);
    expect(opts.action.label).toBe("Reload");
    // Must not auto-dismiss - the point is that the user sees it whenever they
    // come back to the tab.
    expect(opts.duration).toBe(Infinity);
  });

  it("stays silent while the tab is running the current build", async () => {
    mockVersion({ buildId: "old-build" });
    render(<NewVersionWatcher />);

    await new Promise((r) => setTimeout(r, 20));
    expect(toast).not.toHaveBeenCalled();
  });

  it("stays silent against a deploy that predates version.json", async () => {
    mockVersion({}, false);
    render(<NewVersionWatcher />);

    await new Promise((r) => setTimeout(r, 20));
    expect(toast).not.toHaveBeenCalled();
  });

  it("does not nag twice for the same deploy", async () => {
    mockVersion({ buildId: "new-build" });
    render(<NewVersionWatcher />);

    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((r) => setTimeout(r, 20));
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("survives a failed fetch instead of crashing the app", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() => render(<NewVersionWatcher />)).not.toThrow();

    await new Promise((r) => setTimeout(r, 20));
    expect(toast).not.toHaveBeenCalled();
  });
});
