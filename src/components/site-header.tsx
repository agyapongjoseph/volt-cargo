import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/sourcing", label: "Sourcing" },
  { to: "/track", label: "Tracking" },
  { to: "/#pricing", label: "Pricing" },
  { to: "/#contact", label: "Contact Us" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-navy/5 bg-white/80 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-8">
          <img
            src="https://9q2eejtmhi.ufs.sh/f/d8EdUjADIce9Q1BoILwrQF0SXWVDEYMIpjnctyT1kBl8z3He"
            alt="Logo"
            className="h-7 w-21"
          />
          <div className="hidden items-center gap-6 text-sm font-medium text-navy/60 md:flex">
            {links.map((l) => (
              <a key={l.label} href={l.to} className="transition-colors hover:text-brand">
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          {/* <Link
            to="/auth"
            className="text-sm font-semibold text-navy transition-colors hover:text-brand"
          >
            Request Quote
          </Link> */}
          <Link
            to="/auth"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand/90"
          >
            Login in now
          </Link>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-navy"
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-navy/5 pt-4 md:hidden">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.to}
              className="text-sm font-medium text-navy/70"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/auth"
            className="rounded-full bg-brand px-5 py-2.5 text-center text-sm font-semibold text-white"
            onClick={() => setOpen(false)}
          >
            Request Quote
          </Link>
        </div>
      )}
    </nav>
  );
}
