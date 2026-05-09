import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";

const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockResetPassword = vi.fn();
const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (...a: any[]) => mockSignUp(...a),
      signInWithPassword: (...a: any[]) => mockSignInWithPassword(...a),
      resetPasswordForEmail: (...a: any[]) => mockResetPassword(...a),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual: any = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>
  );

describe("AuthPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders email login form by default", () => {
    renderPage();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("toggles between login and signup modes", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
  });

  it("calls signInWithPassword on login submit", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() =>
      expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "secret123" })
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
  });

  it("blocks signup when password is weak", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "new@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "weakpass" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Weak password" }))
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("calls signUp when password is strong", async () => {
    mockSignUp.mockResolvedValue({ error: null });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "new@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Strong1!Pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
    await waitFor(() =>
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@b.com", password: "Strong1!Pass" })
      )
    );
  });

  it("sends a password reset email from forgot mode", async () => {
    mockResetPassword.mockResolvedValue({ error: null });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith(
        "a@b.com",
        expect.objectContaining({ redirectTo: expect.stringContaining("/reset-password") })
      )
    );
  });

  it("shows error toast when login fails", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText("Email address"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong1" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Error", variant: "destructive" })
      )
    );
  });
});
