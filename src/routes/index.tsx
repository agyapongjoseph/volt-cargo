import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Anchor,
  Plane,
  ShieldCheck,
  Truck,
  Warehouse,
  Check,
  ChevronDown,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  PackageSearch,
  ClipboardCheck,
  Ship,
} from "lucide-react";
import heroImg from "@/assets/hero-cargo.jpg";
import qcImg from "@/assets/feature-qc.jpg";
import consImg from "@/assets/feature-consolidation.jpg";
import trackImg from "@/assets/feature-tracking.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-surface font-sans text-navy">
      <SiteHeader />
      <Hero />
      <DashboardPreview />
      <Services />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <FAQ />
      <Contact />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  return (
    <section className="relative overflow-hidden px-6 py-20 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div className="animate-fade-up">
          <span className="mb-6 inline-block rounded-full bg-brand/10 px-4 py-1.5 text-xs font-bold tracking-widest uppercase text-brand">
            Digital Freight Forwarding Solutions
          </span>
          <h1 className="mb-8 text-5xl leading-[1.1] font-bold tracking-tight lg:text-7xl">
            Global Shipping <br />
            <span className="text-brand">Made Simple.</span>
          </h1>
          <p className="mb-10 max-w-lg text-lg leading-relaxed text-navy/60">
            The enterprise logistics platform connecting China to Ghana. Manage freight, tracking,
            and customs with a single digital consignment code.
          </p>
          <form
            className="flex flex-wrap gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) navigate({ to: "/track", search: { code: code.trim() } });
              else navigate({ to: "/track" });
            }}
          >
            <div className="relative min-w-[300px] flex-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                type="text"
                placeholder="Enter Consignment Code (e.g. VC-2026-A9F3C8D2E1B4)"
                className="w-full rounded-2xl border border-navy/10 bg-white pr-32 pl-6 py-4 text-sm shadow-xl shadow-navy/5 transition-all focus:ring-2 focus:ring-brand/20 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute top-2 right-2 bottom-2 rounded-xl bg-navy px-6 font-medium text-white transition-colors hover:bg-navy/90"
              >
                Track Now
              </button>
            </div>
          </form>
          <div className="mt-8 flex items-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand/90"
            >
              Sign up now <ArrowRight className="h-4 w-4" />
            </Link>
            {/* <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="inline-flex items-center gap-2 rounded-full border border-navy/10 px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-white"
            >
              Sign in
            </Link> */}
          </div>
        </div>
        <div className="relative animate-fade-up [animation-delay:150ms]">
          <div className="w-full overflow-hidden rounded-3xl shadow-2xl outline outline-navy/10 -outline-offset-1">
            <img
              src={heroImg}
              alt="Container ship transporting cargo across the ocean"
              width={1280}
              height={960}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 rounded-2xl border border-navy/5 bg-white p-6 shadow-2xl animate-bounce-subtle">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-green/10 text-xl font-bold text-accent-green">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-navy/40 uppercase">
                  Latest Status
                </p>
                <p className="font-bold">Arrived at Ghana Port</p>
              </div>
            </div>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-navy/5">
              <div className="h-full w-3/4 bg-accent-green" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="overflow-hidden bg-white px-6 py-24" id="solutions">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <span className="mb-5 inline-flex rounded-full bg-brand/10 px-4 py-1.5 text-xs font-bold tracking-widest text-brand uppercase">
            Sourcing + Shipping
          </span>
          <h2 className="mb-6 text-4xl leading-tight font-bold tracking-tight lg:text-5xl">
            Buy from China with a team that checks, ships, and delivers for you.
          </h2>
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-navy/55">
            VoltCargo helps importers find reliable suppliers, verify goods before payment or
            shipment, consolidate packages, and move cargo from China to Ghana with clear tracking.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand/90"
            >
              Request Sourcing Help <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/track"
              className="inline-flex items-center gap-2 rounded-full border border-navy/10 px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-surface"
            >
              Track Shipment
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative rounded-[2rem] border border-navy/5 bg-surface p-4 shadow-2xl shadow-navy/10">
            <div className="rounded-[1.5rem] bg-navy p-6 text-white">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-widest text-white/40 uppercase">
                    Import Request
                  </p>
                  <h3 className="mt-1 text-2xl font-bold">Electronics from Guangzhou</h3>
                </div>
                <span className="rounded-full bg-accent-green/15 px-3 py-1 text-xs font-bold text-accent-green">
                  Verified
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <SolutionStep
                  icon={PackageSearch}
                  title="Source"
                  desc="Supplier search, price checks, and purchase guidance."
                />
                <SolutionStep
                  icon={ClipboardCheck}
                  title="Inspect"
                  desc="Warehouse QC with photos, counts, and condition checks."
                />
                <SolutionStep
                  icon={Ship}
                  title="Ship"
                  desc="Air, sea, customs support, and Ghana delivery updates."
                />
              </div>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-3">
              {[
                ["China buying support", "Supplier verification before you commit"],
                ["Consolidation", "Combine purchases from multiple vendors"],
                ["Live tracking", "Consignment code updates from dispatch to delivery"],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-2xl bg-white p-5 shadow-sm">
                  <Check className="mb-4 h-5 w-5 text-accent-green" />
                  <h4 className="mb-2 font-bold">{title}</h4>
                  <p className="text-sm leading-relaxed text-navy/50">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SolutionStep({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof PackageSearch;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="mb-2 font-bold">{title}</h4>
      <p className="text-sm leading-relaxed text-white/55">{desc}</p>
    </div>
  );
}

const services = [
  {
    icon: Plane,
    title: "Air Freight",
    desc: "Priority express from Shenzhen and Guangzhou to Accra in 3–5 business days.",
  },
  {
    icon: Anchor,
    title: "Ocean Freight",
    desc: "FCL and LCL solutions with weekly sailings and competitive rates.",
  },
  {
    icon: ShieldCheck,
    title: "Cargo Insurance",
    desc: "Full protection on fragile shipments and VoltCargo-supplied inventory.",
  },
  {
    icon: Truck,
    title: "Door to Door Delivery",
    desc: "Last-mile delivery across Ghana with proof-of-delivery and signature capture.",
  },
  {
    icon: Warehouse,
    title: "Warehousing",
    desc: "Secure storage and QC in Shenzhen and Tema with 24/7 digital visibility.",
  },
];

function Services() {
  return (
    <section className="bg-surface px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">Our Shipping Services</h2>
          <p className="text-navy/50">
            One platform for every leg of the China–Ghana trade corridor.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {services.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-navy/5 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-navy/50">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">The New Standard in Freight</h2>
          <p className="text-navy/50">
            Every step digitized — from the supplier's warehouse in China to your doorstep in Ghana.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard
            title="Warehouse QC"
            desc="Officers inspect every item. Receive photos, videos, and condition reports directly in your dashboard."
            img={qcImg}
          />
          <FeatureCard
            title="LCL Consolidation"
            desc="Save costs by grouping shipments. We manage container loading, manifest generation, and Ocean Freight."
            img={consImg}
          />
          <FeatureCard
            title="Real-time Tracking"
            desc="From China departure to Ghana clearance. Every milestone tracked with automated alerts."
            img={trackImg}
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ title, desc, img }: { title: string; desc: string; img: string }) {
  return (
    <div className="group rounded-3xl border border-navy/5 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-6 overflow-hidden rounded-2xl">
        <img
          src={img}
          alt={title}
          loading="lazy"
          width={832}
          height={512}
          className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <h4 className="mb-3 text-xl font-bold">{title}</h4>
      <p className="text-sm leading-relaxed text-navy/50">{desc}</p>
    </div>
  );
}

const steps = [
  {
    n: "01",
    title: "Create Shipment",
    desc: "Client submits supplier details, receives consignment code.",
  },
  { n: "02", title: "China Warehouse", desc: "Goods received, inspected, and photographed." },
  { n: "03", title: "Consolidation", desc: "Packages grouped into LCL or full container." },
  { n: "04", title: "Shipped", desc: "Loaded and departed for Ghana by air or sea." },
  { n: "05", title: "Port Clearance", desc: "Customs and duties handled by clearing agents." },
  { n: "06", title: "Delivered", desc: "Doorstep delivery with proof and signature." },
];

function HowItWorks() {
  return (
    <section className="bg-surface px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">How It Works</h2>
          <p className="text-navy/50">Six steps from supplier pickup to your doorstep.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-navy/5 bg-white p-6">
              <div className="mb-4 text-sm font-bold tracking-widest text-brand">{s.n}</div>
              <h4 className="mb-2 text-lg font-bold">{s.title}</h4>
              <p className="text-sm text-navy/50">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const tiers = [
  {
    name: "Air Express",
    price: "$20",
    unit: "/ kg",
    features: [
      "2–5 day delivery",
      "Real-time tracking",
      "Priority handling",
      "Insurance available",
    ],
  },
  {
    name: "Air Normal",
    price: "$15",
    unit: "/ kg",
    features: [
      "7–14 day delivery",
      "Reliable air cargo",
      "Tracking updates",
      "Great for regular stock",
    ],
  },
  {
    name: "Ocean LCL",
    price: "$250",
    unit: "/ CBM",
    features: ["Weekly sailings", "Consolidation service", "QC inspection", "Customs clearance"],
    featured: true,
  },
  {
    name: "Ocean FCL",
    price: "5,900",
    unit: "20ft / 40ft",
    features: ["Full container", "Dedicated route", "End-to-end handling", "Door to Door Delivery"],
  },
];

function Pricing() {
  return (
    <section className="bg-white px-6 py-24" id="pricing">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
          <p className="text-navy/50">No hidden fees. Pay only for what you ship.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-3xl border p-8 transition-all ${
                t.featured
                  ? "border-brand bg-navy text-white shadow-2xl shadow-brand/20"
                  : "border-navy/5 bg-surface"
              }`}
            >
              <h3 className={`mb-2 text-xl font-bold ${t.featured ? "text-white" : ""}`}>
                {t.name}
              </h3>
              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-5xl font-bold">{t.price}</span>
                <span className={t.featured ? "text-white/50" : "text-navy/50"}>{t.unit}</span>
              </div>
              <ul className="mb-8 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check
                      className={`h-4 w-4 ${t.featured ? "text-accent-green" : "text-brand"}`}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className={`inline-block w-full rounded-full py-3 text-center text-sm font-semibold transition-colors ${
                  t.featured
                    ? "bg-brand text-white hover:bg-brand/90"
                    : "bg-navy text-white hover:bg-navy/90"
                }`}
              >
                Sign up now
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className={`mt-3 inline-block w-full rounded-full border py-3 text-center text-sm font-semibold transition-colors ${
                  t.featured
                    ? "border-white/15 text-white hover:bg-white/10"
                    : "border-navy/10 text-navy hover:bg-white"
                }`}
              >
                Sign in
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const testimonials = [
  {
    name: "Akosua Mensah",
    role: "Owner, Accra Electronics Hub",
    quote:
      "VoltCargo cut our lead time from Shenzhen by two weeks. The QC photos before shipping mean we never receive surprises.",
  },
  {
    name: "Kwame Asante",
    role: "Managing Director, Trendline Apparel",
    quote:
      "The consignment tracking is a game-changer. My customers can follow their order the moment it leaves China.",
  },
  {
    name: "Fatima Osei",
    role: "Founder, Osei Auto Parts",
    quote:
      "Consolidation dropped my Ocean Freight bills by 40%. The Hubtel invoicing makes payments frictionless.",
  },
];

function Testimonials() {
  return (
    <section className="bg-surface px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">Trusted by Ghanaian Importers</h2>
          <p className="text-navy/50">
            From small traders to enterprise brands, VoltCargo powers cross-border trade.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-3xl border border-navy/5 bg-white p-8">
              <p className="mb-6 text-navy/70 leading-relaxed">"{t.quote}"</p>
              <div>
                <p className="font-bold">{t.name}</p>
                <p className="text-sm text-navy/50">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "Where is your office located in Ghana?",
    a: "You can locate our Ghana office at East Legon.",
  },
  {
    q: "Where is your office located in China?",
    a: "You can locate our China office at 2F12, 2nd Flooe, Jiuzhilong Trade City No. 18 Guangyuan West Road Kuagquan Street, Yuexiu District Guangzhou City, Guangdong Province, China 广东省广州市越秀区广州市矿泉街道广园西路18号九之龙商贸城2楼2F12.",
  },
  {
    q: "Where is your warehouse located in China?",
    a: "North Area of Shanghua Industrial ZoneLecong Town, Shunde District Foshan City, Guangdong Province, China 佛山市顺德区乐从镇上华工业北区1号 ",
  },
  {
    q: "How do I get my consignment code?",
    a: "Once you create a shipment in your VoltCargo dashboard, a unique secure consignment code (e.g. VC-2026-A9F3C8D2E1B4) is generated automatically.",
  },
  {
    q: "Do you provide insurance.?",
    a: "Yes. All goods shipped are insured.",
  },
  {
    q: "How are payments processed?",
    a: "All payments are processed securely via Hubtel — mobile money, cards, wallets, GhQR, cash, and cheque. Goods are released for delivery only after full payment is confirmed.",
  },
  {
    q: "Do you do door to door delivery?",
    a: "Yes. we are able to arrange for delivery for you when your things are in Ghana.",
  },
  {
    q: "Do you do sourcing?",
    a: "Yes. We are able to support you source goods and get in touch with reliable suppliers from China. Electronics, Building Materials, machines, Cars. Kindly click on the sourcing tap to view our sourcing page",
  },
  {
    q: "Do you do consolidation?",
    a: "We offer consolidation and also repacking of goods at our China warehouse.",
  },
  {
    q: "What is your CBM?",
    a: "$250 per cbm.",
  },
  {
    q: "How long does goods take to get to Ghana?",
    a: "Goods take 45 days to get to you in Ghana. ",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? faqs : faqs.slice(0, 5);

  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-navy/10 rounded-3xl border border-navy/5 bg-surface">
          {visibleFaqs.map((f, i) => (
            <div key={f.q} className="p-6">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="font-bold text-navy">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 text-brand transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && <p className="mt-4 text-sm leading-relaxed text-navy/60">{f.a}</p>}
            </div>
          ))}
        </div>
        {faqs.length > 5 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setShowAll((value) => !value);
                setOpen(0);
              }}
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
            >
              {showAll ? "View less" : "View more"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="bg-surface px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight">Get in Touch</h2>
          <p className="text-navy/50">Our team is available around the clock.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <ContactCard
            icon={MessageCircle}
            label="WhatsApp"
            value="+81 195 7513 8492"
            href="https://wa.me/8119575138492"
          />
          <ContactCard
            icon={Mail}
            label="Email"
            value="voltcargo@gmail.com"
            href="mailto:voltcargo@gmail.com"
          />
          <ContactCard icon={Phone} label="China Call line" value="+81 195 7513 8492" />
          <ContactCard icon={Phone} label="Ghana Call line" value="+233 55 169 0356" />
        </div>
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-navy/50">
          <MapPin className="h-4 w-4" /> Head Office, East Legon, Ghana
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-bold tracking-widest text-navy/40 uppercase">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noreferrer" : undefined}
        className="flex items-center gap-4 rounded-2xl border border-navy/5 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-navy/5 bg-white p-6">
      {content}
    </div>
  );
}
