import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Auth from "../pages/Auth";
import AuthCallback from "../pages/AuthCallback";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase Auth
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  },
}));

// Mock useAuth hook
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, session: null, roles: [], loading: false }),
}));

describe("Auth Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("renders Sign In view by default with Google and Email options", () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
    expect(screen.getByText("Sign In & Access Dashboard")).toBeInTheDocument();
  });

  it("switches to Create Account mode when tab is clicked", () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </MemoryRouter>
    );

    const createAccountTab = screen.getByRole("button", { name: "Create Account" });
    fireEvent.click(createAccountTab);

    expect(screen.getByText("Create Your Account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("M-Pesa Mobile Number")).toBeInTheDocument();
  });

  it("triggers Google Sign-In with target redirect saved", async () => {
    (supabase.auth.signInWithOAuth as any).mockResolvedValue({ data: {}, error: null });

    render(
      <MemoryRouter initialEntries={["/auth?redirect=/checkout/123"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </MemoryRouter>
    );

    const googleBtn = screen.getByText("Continue with Google");
    fireEvent.click(googleBtn);

    expect(sessionStorage.getItem("auth_redirect_target")).toBe("/checkout/123");
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  });

  it("handles Email Sign-In submission", async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: { user: { id: "1" } }, error: null });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("merchant@example.com"), {
      target: { value: "USER@EXAMPLE.COM " },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "secret123" },
    });

    const submitBtn = screen.getByRole("button", { name: /Sign In & Access/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
    });
  });

  it("switches to Forgot Password view and submits reset request", async () => {
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ data: {}, error: null });

    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </MemoryRouter>
    );

    const forgotBtn = screen.getByText("Forgot password?");
    fireEvent.click(forgotBtn);

    expect(screen.getByText("Reset Your Password")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("merchant@example.com"), {
      target: { value: "user@example.com" },
    });

    const sendResetBtn = screen.getByRole("button", { name: "Send Reset Link" });
    fireEvent.click(sendResetBtn);

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    });
  });
});

describe("AuthCallback Component", () => {
  it("renders authenticating state", () => {
    render(
      <MemoryRouter initialEntries={["/auth/callback"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Authenticating with Google...")).toBeInTheDocument();
  });
});
