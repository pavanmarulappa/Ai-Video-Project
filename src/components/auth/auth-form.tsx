"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "We couldn't sign you in. Please try again.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the app. Check that the server is running and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      {isRegister && (
        <label className="field-label">
          Name
          <input className="text-input" name="name" autoComplete="name" minLength={2} maxLength={60} required />
        </label>
      )}
      <label className="field-label">
        Email address
        <input className="text-input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field-label">
        Password
        <input className="text-input" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 10 : undefined} required />
        {isRegister && <span className="field-hint">At least 10 characters.</span>}
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-wide" type="submit" disabled={pending}>
        {pending ? "Please wait…" : isRegister ? "Create your account" : "Sign in"}
      </button>
      <p className="form-switch">
        {isRegister ? "Already have an account? " : "New to Frameforge? "}
        <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link>
      </p>
    </form>
  );
}
