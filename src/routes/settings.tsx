import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { PortalShell } from "@/components/portal-shell";
import {
  deleteCurrentClientAccount,
  getSessionProfile,
  updateCurrentClientProfile,
} from "@/lib/data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — VoltCargo" },
      { name: "description", content: "Update your VoltCargo account settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["session-profile"],
    queryFn: getSessionProfile,
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () => updateCurrentClientProfile({ name, email, phone }),
    onSuccess: async () => {
      setMessage(
        "Profile updated successfully. You may need to refresh the page to see the changes reflected in your account.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["session-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["client-dashboard"] }),
      ]);
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : "Could not update profile.");
    },
  });
  const deleteAccountMutation = useMutation({
    mutationFn: deleteCurrentClientAccount,
    onSuccess: () => {
      window.location.href = "/auth";
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : "Could not delete account.");
    },
  });

  useEffect(() => {
    if (!profile?.client) return;
    setName(profile.client.name);
    setEmail(profile.user?.email || profile.client.email);
    setPhone(profile.client.phone);
  }, [profile]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <PortalShell role="client" title="Loading settings" subtitle="Fetching your profile">
        <PanelMessage>Loading account settings...</PanelMessage>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell role="client" title="Settings unavailable" subtitle="Supabase returned an error">
        <PanelMessage>
          {error instanceof Error ? error.message : "Could not load settings."}
        </PanelMessage>
      </PortalShell>
    );
  }

  if (!profile?.client) {
    return (
      <PortalShell role="client" title="Sign in required" subtitle="No client profile found">
        <PanelMessage>
          Sign in at{" "}
          <Link to="/auth" className="font-semibold text-brand hover:underline">
            /auth
          </Link>{" "}
          to edit your account settings.
        </PanelMessage>
      </PortalShell>
    );
  }

  return (
    <PortalShell role="client" title="Settings" subtitle="Manage your VoltCargo account">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-2xl border border-navy/5 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-widest text-brand uppercase">Profile</p>
            <h1 className="mt-2 text-2xl font-bold text-navy">Account details</h1>
            <p className="mt-2 text-sm text-navy/55">
              Update the contact details VoltCargo uses for shipment updates and invoices.
            </p>
          </div>

          {message && (
            <p className="mb-5 rounded-xl bg-surface p-3 text-sm text-navy/70">{message}</p>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Field label="Full name" value={name} onChange={setName} required />
            <Field label="Email" value={email} onChange={setEmail} type="email" required />
            <Field
              label="Phone number"
              value={phone}
              onChange={setPhone}
              placeholder="+233 24 000 0000"
            />
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-accent-red/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold tracking-widest text-accent-red uppercase">Danger zone</p>
          <h2 className="mt-2 text-xl font-bold text-navy">Delete account</h2>
          <p className="mt-3 text-sm leading-relaxed text-navy/55">
            Permanently delete your VoltCargo login, profile, shipments, invoices, documents, and
            messages. This action cannot be undone.
          </p>
          <button
            onClick={() => {
              setMessage(null);
              const confirmed = window.confirm(
                "This will permanently delete your VoltCargo account and shipment records. Continue?",
              );
              if (confirmed) deleteAccountMutation.mutate();
            }}
            disabled={deleteAccountMutation.isPending}
            className="mt-6 rounded-full border border-accent-red/20 bg-accent-red/10 px-5 py-2.5 text-sm font-semibold text-accent-red hover:bg-accent-red/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleteAccountMutation.isPending ? "Deleting..." : "Delete my account"}
          </button>
        </section>
      </div>
    </PortalShell>
  );
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

function PanelMessage({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy/5 bg-white p-8 text-sm text-navy/60 shadow-sm">
      {children}
    </div>
  );
}
