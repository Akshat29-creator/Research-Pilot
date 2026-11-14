import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";

// Mock useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  it("renders email, password inputs, branding, and autofill button", () => {
    render(<LoginPage />);

    expect(screen.getByText("Sign In to Workspace")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("pilot@researchpilot.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••••••")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in to workstation/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /autofill demo credentials/i })
    ).toBeInTheDocument();
  });

  it("populates fields when Autofill Demo Credentials is clicked", () => {
    render(<LoginPage />);

    const autofillBtn = screen.getByRole("button", { name: /autofill demo credentials/i });
    fireEvent.click(autofillBtn);

    const emailInput = screen.getByPlaceholderText("pilot@researchpilot.com") as HTMLInputElement;
    const passInput = screen.getByPlaceholderText("••••••••••••") as HTMLInputElement;

    expect(emailInput.value).toBe("pilot@researchpilot.com");
    expect(passInput.value).toBe("PilotSecurePass123!");
  });

  it("toggles password visibility when eye button is clicked", () => {
    render(<LoginPage />);

    const toggleBtn = screen.getByRole("button", { name: /show password/i });
    const passInput = screen.getByPlaceholderText("••••••••••••") as HTMLInputElement;

    expect(passInput.type).toBe("password");
    fireEvent.click(toggleBtn);
    expect(passInput.type).toBe("text");
  });
});

describe("RegisterPage", () => {
  it("renders email, password, and confirm password fields", () => {
    render(<RegisterPage />);

    expect(screen.getByText("Create Local Account")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("researcher@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account & initialize/i })
    ).toBeInTheDocument();
    expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("Passwords match")).toBeInTheDocument();
  });

  it("displays error banner when passwords do not match", async () => {
    render(<RegisterPage />);

    const emailInput = screen.getByPlaceholderText("researcher@example.com");
    const passInputs = screen.getAllByPlaceholderText("••••••••••••");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passInputs[0], { target: { value: "Password123" } });
    fireEvent.change(passInputs[1], { target: { value: "DifferentPassword" } });

    const submitBtn = screen.getByRole("button", { name: /create account & initialize/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });
  });

  it("displays error banner when password is under 8 characters", async () => {
    render(<RegisterPage />);

    const emailInput = screen.getByPlaceholderText("researcher@example.com");
    const passInputs = screen.getAllByPlaceholderText("••••••••••••");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passInputs[0], { target: { value: "short" } });
    fireEvent.change(passInputs[1], { target: { value: "short" } });

    const submitBtn = screen.getByRole("button", { name: /create account & initialize/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 8 characters long.")
      ).toBeInTheDocument();
    });
  });
});
