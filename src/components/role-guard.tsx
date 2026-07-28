import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PortalShell, type PortalRole } from "@/components/portal-shell";
import { getSessionProfile, type AppRole } from "@/lib/data";

export function RoleGuard({
  role,
  allowed,
  children,
}: {
  role: PortalRole;
  allowed: AppRole[];
  children: ReactNode;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["session-profile"],
    queryFn: getSessionProfile,
  });

  if (isLoading) {
    return (
      <PortalShell role={role} title="Checking access" subtitle="Verifying your account role">
        <AccessCard>Checking your permissions...</AccessCard>
      </PortalShell>
    );
  }

  if (error) {
    return (
      <PortalShell role={role} title="Access check failed" subtitle="Supabase returned an error">
        <AccessCard>
          {error instanceof Error ? error.message : "Could not verify access."}
        </AccessCard>
      </PortalShell>
    );
  }

  if (!data?.user) {
    return (
      <PortalShell role={role} title="Sign in required" subtitle="This portal is protected">
        <AccessCard>
          Sign in to continue.{" "}
          <Link to="/auth" className="font-semibold text-brand hover:underline">
            Go to sign in
          </Link>
        </AccessCard>
      </PortalShell>
    );
  }

  const hasAccess = allowed.some((allowedRole) => data.roles.includes(allowedRole));
  if (!hasAccess) {
    return (
      <PortalShell
        role={role}
        title="Not authorized"
        subtitle="Your role cannot access this portal"
      >
        <AccessCard>
          Your account does not have the required role for this portal. Current roles:{" "}
          <span className="font-mono">{data.roles.length ? data.roles.join(", ") : "none"}</span>.
        </AccessCard>
      </PortalShell>
    );
  }

  return <>{children}</>;
}

function AccessCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy/5 bg-white p-8 text-sm text-navy/60 shadow-sm">
      {children}
    </div>
  );
}
