import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { hasSupabaseConfig, supabase } from "@/lib/supabase/client";
import { getSessionProfile, type AppRole } from "@/lib/data";
import { z } from "zod";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign In — VoltCargo" },
      { name: "description", content: "Sign in to your VoltCargo client or admin account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!supabase) {
      setMessage("Add your Supabase URL and anon key to .env before using auth.");
      return;
    }

    setLoading(true);
    const result = await (
      mode === "signup"
        ? supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: getAuthRedirectUrl(),
              data: { full_name: fullName.trim(), phone: phone.trim(), country: country.trim() },
            },
          })
        : supabase.auth.signInWithPassword({ email: email.trim(), password })
    ).catch((error: unknown) => ({
      data: null,
      error,
    }));
    setLoading(false);

    if (result.error) {
      setMessage(getAuthErrorMessage(result.error));
      return;
    }

    if (mode === "signup") {
      setMessage("Account created. Check your email if confirmation is enabled, then sign in.");
      setMode("signin");
      return;
    }

    const profile = await getSessionProfile();
    navigate({ to: portalForRoles(profile.roles) });
  };

  return (
    <div className="min-h-screen bg-surface text-navy">
      <SiteHeader />
      <section className="px-6 py-24">
        <div className="mx-auto max-w-md rounded-3xl border border-navy/5 bg-white p-10 shadow-xl shadow-navy/5">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mb-6 text-sm text-navy/60">
            Access shipment tracking, invoices, and your permanent VoltCargo Client ID.
          </p>

          {!hasSupabaseConfig && (
            <div className="mb-6 rounded-2xl border border-accent-orange/20 bg-accent-orange/10 p-4 text-sm text-navy/70">
              Add <span className="font-mono">VITE_SUPABASE_URL</span> and{" "}
              <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> to{" "}
              <span className="font-mono">.env</span> to activate this form.
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 rounded-full border border-navy/10 bg-surface p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-full py-2 font-semibold ${mode === "signin" ? "bg-brand text-white" : "text-navy/60"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-full py-2 font-semibold ${mode === "signup" ? "bg-brand text-white" : "text-navy/60"}`}
            >
              Sign up
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <>
                <Field label="Full name" value={fullName} onChange={setFullName} required />
                <Field
                  label="Country"
                  value={country}
                  onChange={setCountry}
                  placeholder="Ghana"
                  required
                />
                <Field
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+233 24 000 0000"
                />
              </>
            )}
            <Field label="Email" value={email} onChange={setEmail} type="email" required />
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold text-navy/70">Password</span>
              <div className="relative">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full rounded-xl border border-navy/10 bg-surface px-4 py-3 pr-11 text-sm focus:border-brand focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {message && <p className="rounded-xl bg-surface p-3 text-sm text-navy/70">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand py-3 text-center text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
            <Link
              to="/"
              className="block w-full rounded-full border border-navy/10 py-3 text-center text-sm font-semibold text-navy/70 hover:bg-surface"
            >
              Back to home
            </Link>
          </form>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function getAuthRedirectUrl() {
  return `${window.location.origin}/auth?mode=signin`;
}

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return "Authentication failed. Please try again or contact VoltCargo support.";
}

function portalForRoles(roles: AppRole[]) {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("staff_warehouse_cn")) return "/warehouse";
  if (roles.includes("staff_qc")) return "/qc";
  if (roles.includes("staff_delivery")) return "/delivery";
  return "/dashboard";
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-navy/70">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-navy/10 bg-surface px-4 py-3 text-sm focus:border-brand focus:outline-none"
      />
    </label>
  );
}
