import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Factory, PackageCheck, SearchCheck, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import heroImg from "@/assets/hero-cargo.jpg";
import qcImg from "@/assets/feature-qc.jpg";
import consImg from "@/assets/feature-consolidation.jpg";

// New category photography — add these files under src/assets.
// Use real photos of items you've sourced/shipped where possible; that's
// what actually builds trust on a sourcing page. Stock photography in the
// meantime is fine as a placeholder, but swap it out as you build a library.
import catElectronics from "@/assets/category-electronics.jpg";
import catFashion from "@/assets/category-fashion.jpg";
import catHome from "@/assets/category-home.jpg";
import catBeauty from "@/assets/category-beauty.jpg";
import catAutoParts from "@/assets/category-auto-parts.jpg";
import catPackaging from "@/assets/category-packaging.jpg";
import catFurniture from "@/assets/category-furniture.jpg";
import catEquipment from "@/assets/category-equipment.jpg";
import showcase1 from "@/assets/showcase-warehouse-1.jpg";
import showcase2 from "@/assets/showcase-warehouse-2.jpg";
import showcase3 from "@/assets/showcase-warehouse-3.jpg";
import showcase4 from "@/assets/showcase-warehouse-4.jpg";

const whatsappHref = "https://wa.me/8119575138492";

const categories = [
  {
    name: "Electronics & accessories",
    detail: "Phones, audio, smart devices, chargers",
    img: catElectronics,
  },
  {
    name: "Fashion & footwear",
    detail: "Apparel, shoes, bags, accessories",
    img: catFashion,
  },
  {
    name: "Home & kitchen",
    detail: "Appliances, cookware, storage",
    img: catHome,
  },
  {
    name: "Furniture",
    detail: "Office, home, and outdoor furniture",
    img: catFurniture,
  },
  {
    name: "Building Materials & Industrial equipment",
    detail: "Machinery, tools, workshop gear",
    img: catEquipment,
  },
  {
    name: "Auto parts",
    detail: "OEM and aftermarket components",
    img: catAutoParts,
  },
  {
    name: "Beauty & personal care",
    detail: "Cosmetics, skincare, grooming",
    img: catBeauty,
  },
  {
    name: "Packaging & branded goods",
    detail: "Custom packaging, promotional items",
    img: catPackaging,
  },
];

const steps = [
  {
    icon: SearchCheck,
    title: "Find reliable suppliers",
    desc: "We help compare options, pricing, minimum order quantities, and supplier credibility before you pay.",
  },
  {
    icon: ShieldCheck,
    title: "Verify before shipment",
    desc: "Your goods can be checked at our China warehouse with photos, counts, and basic quality inspection.",
  },
  {
    icon: PackageCheck,
    title: "Consolidate and ship",
    desc: "We combine purchases from multiple suppliers and move them by Air Express, Air Normal, or Ocean Freight.",
  },
];

export const Route = createFileRoute("/sourcing")({
  head: () => ({
    meta: [
      { title: "China Sourcing — VoltCargo" },
      {
        name: "description",
        content:
          "VoltCargo helps businesses source goods from China, inspect purchases, consolidate cargo, and ship to Ghana.",
      },
    ],
  }),
  component: SourcingPage,
});

function SourcingPage() {
  return (
    <div className="min-h-screen bg-surface text-navy">
      <SiteHeader />

      {/* Hero */}
      <section className="overflow-hidden px-6 py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
          <div>
            <span className="mb-6 inline-flex rounded-full bg-brand/10 px-4 py-1.5 text-xs font-bold tracking-widest text-brand uppercase">
              China Sourcing Support
            </span>
            <h1 className="mb-6 text-5xl leading-tight font-bold tracking-tight lg:text-7xl">
              Tell us what you need. We help you get it from China.
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-navy/60">
              From supplier discovery to warehouse inspection and shipping, VoltCargo gives Ghanaian
              importers a safer way to buy from China without guessing who to trust.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand/90"
              >
                Consult us <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#categories"
                className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-white/70"
              >
                See what we source
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
            <div className="relative grid gap-4">
              <img
                src={heroImg}
                alt="Cargo containers and global trade route"
                className="aspect-[4/3] rounded-[2rem] object-cover shadow-2xl shadow-navy/10"
              />
              <div className="absolute -bottom-6 left-6 right-6 rounded-3xl border border-navy/5 bg-white p-5 shadow-2xl shadow-navy/10">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-green/10 text-accent-green">
                    <Factory className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-navy/40 uppercase">
                      Supplier Check
                    </p>
                    <p className="font-bold">
                      Price, quality, and delivery verified before shipping
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category gallery — photo-first grid, this is the main visual upgrade */}
      <section className="bg-white px-6 py-24" id="categories">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <h2 className="mb-4 text-4xl font-bold tracking-tight">What We Can Help You Source</h2>
            <p className="text-navy/55">
              If it can be legally purchased and shipped, our team can help you check supplier
              options and move it through the right freight channel — from a single sample to
              container loads.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <div
                key={category.name}
                className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-navy shadow-sm"
              >
                <img
                  src={category.img}
                  alt={category.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <h3 className="text-base font-bold text-white sm:text-lg">{category.name}</h3>
                  <p className="mt-1 text-xs text-white/70 sm:text-sm">{category.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-3xl border border-navy/5 bg-white p-8 shadow-sm"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <step.icon className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-navy/55">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Warehouse photo strip — builds trust with real evidence of the process */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">Inside Our China Warehouse</h2>
            <p className="text-navy/55">
              Every shipment passes through hands that check it before it leaves — here&apos;s a
              look at that process.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[showcase1, showcase2, showcase3, showcase4].map((src, i) => (
              <img
                key={i}
                src={src}
                alt="Warehouse sourcing and inspection process"
                className="aspect-square rounded-2xl object-cover shadow-sm"
              />
            ))}
          </div>
        </div>
      </section>

      {/* QC + consolidation */}
      <section className="bg-surface px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <img
            src={qcImg}
            alt="Quality control inspection before shipping"
            className="aspect-video rounded-[2rem] object-cover shadow-xl shadow-navy/10"
          />
          <div className="rounded-[2rem] bg-navy p-8 text-white lg:p-12">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Avoid supplier surprises.</h2>
            <p className="mb-8 leading-relaxed text-white/60">
              We can inspect packages, confirm quantities, document condition, and help you decide
              whether goods are ready to ship before they leave China.
            </p>
            <img
              src={consImg}
              alt="Cargo consolidation warehouse"
              className="mb-8 aspect-video rounded-3xl object-cover opacity-90"
            />
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand/90"
            >
              Consult us on WhatsApp <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
