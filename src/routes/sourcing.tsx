import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Factory,
  Hotel,
  MapPinned,
  PackageCheck,
  Plane,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import heroImg from "@/assets/heroImg.jpg";
import cityImg from "@/assets/cityImg.jpg";
import marketImg from "@/assets/marketImg.jpg";
import chinaImg from "@/assets/chinaImg.jpg";
import qcImg from "@/assets/feature-qc.jpg";
import consImg from "@/assets/feature-consolidation.jpg";
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
import photo4 from "@/assets/photo 4.jpg";
import photo5 from "@/assets/photo 5.jpg";
import photo6 from "@/assets/photo 6.jpg";
import photo7 from "@/assets/photo 7.jpg";
import photo10 from "@/assets/photo 10.jpg";
import photo11 from "@/assets/photo 11.jpg";
import photo12 from "@/assets/photo 12.jpg";
import photo13 from "@/assets/photo 13.jpg";
import photo14 from "@/assets/photo 14.jpg";
import photo15 from "@/assets/photo 15.jpg";
import photo16 from "@/assets/photo 16.jpg";

const whatsappHref = "https://wa.me/8119575138492";

const travelServices = [
  {
    icon: BadgeCheck,
    title: "China visa guidance",
    desc: "We guide business travellers on the documents and preparation needed before applying.",
  },
  {
    icon: Plane,
    title: "Flight booking support",
    desc: "Get practical help choosing routes, travel dates, airport options, and arrival plans.",
  },
  {
    icon: Hotel,
    title: "Hotel booking",
    desc: "Stay close to markets, factories, and business districts that match your buying trip.",
  },
  {
    icon: Factory,
    title: "Supplier and factory visits",
    desc: "We help plan visits, interpret business needs, and keep your movement organized in China.",
  },
];

const sourcingCategories = [
  {
    name: "Electronics & phones",
    detail: "Phones, accessories, smart devices, audio",
    img: catElectronics,
  },
  { name: "Fashion & footwear", detail: "Clothing, shoes, bags, boutique stock", img: catFashion },
  { name: "Home & kitchen", detail: "Appliances, cookware, storage, decor", img: catHome },
  { name: "Furniture", detail: "Office, home, salon, restaurant furniture", img: catFurniture },
  {
    name: "Building materials",
    detail: "Tiles, doors, lighting, sanitary ware",
    img: catEquipment,
  },
  { name: "Auto parts", detail: "OEM and aftermarket parts", img: catAutoParts },
  { name: "Beauty products", detail: "Cosmetics, skincare, salon equipment", img: catBeauty },
  {
    name: "Packaging & branding",
    detail: "Custom boxes, labels, promotional goods",
    img: catPackaging,
  },
];

const tripPlan = [
  "Plan your visa, flight, hotel, and China arrival details",
  "Visit suppliers, markets, factories, and showrooms with better direction",
  "Confirm prices, samples, quantities, and production expectations",
  "Move purchased goods to VoltCargo for inspection, consolidation, and shipping",
];

const serviceGroups = [
  {
    icon: Plane,
    title: "Travel to China",
    desc: "Visa guidance, flight planning, hotel support, arrival direction, and business-trip preparation.",
  },
  {
    icon: Factory,
    title: "Meet suppliers",
    desc: "Wholesale market visits, factory visits, showroom visits, sample checks, and price discussions.",
  },
  {
    icon: PackageCheck,
    title: "Source and ship",
    desc: "Remote product sourcing, warehouse receiving, inspection, consolidation, and delivery to Ghana.",
  },
];

const movingImages = [
  heroImg,
  cityImg,
  marketImg,
  chinaImg,
  showcase1,
  showcase2,
  showcase3,
  showcase4,
  photo4,
  photo5,
  photo6,
  photo7,
  photo10,
  photo11,
  photo12,
  photo13,
  photo14,
  photo15,
  photo16,
];

export const Route = createFileRoute("/sourcing")({
  head: () => ({
    meta: [
      { title: "Coming to China — VoltCargo" },
      {
        name: "description",
        content:
          "VoltCargo helps Ghanaian businesses travel to China, visit suppliers and factories, source products, inspect goods, consolidate cargo, and ship to Ghana.",
      },
    ],
  }),
  component: ComingToChinaPage,
});

function ComingToChinaPage() {
  return (
    <div className="min-h-screen bg-surface text-navy">
      <SiteHeader />

      <section className="relative overflow-hidden bg-navy px-6 py-20 text-white lg:py-28">
        <div className="absolute inset-0 opacity-25">
          <img src={cityImg} alt="China city skyline" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,97,175,0.55),transparent_32%),linear-gradient(120deg,rgba(11,18,33,0.98),rgba(11,18,33,0.62))]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="animate-fade-up">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-widest text-white uppercase backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent-orange" /> Coming to China
            </span>
            <h1 className="mb-6 max-w-4xl text-5xl leading-tight font-black tracking-tight lg:text-7xl">
              Your China buying trip, planned with people who know the ground.
            </h1>
            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-white/70">
              VoltCargo supports Ghanaian entrepreneurs before and during their China trip: visa
              guidance, flight and hotel booking support, supplier visits, factory visits, product
              sourcing, inspection, consolidation, and shipping to Ghana.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand/90"
              >
                Plan my China trip <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
              >
                View services
              </a>
            </div>
          </div>

          <div className="relative min-h-[520px]">
            <img
              src={heroImg}
              alt="Business travel and cargo support in China"
              className="absolute top-0 right-0 h-80 w-[72%] animate-slow-float rounded-[2.5rem] object-cover shadow-2xl shadow-black/30"
            />
            <img
              src={marketImg}
              alt="China wholesale market visit"
              className="absolute bottom-10 left-0 h-72 w-[58%] rounded-[2rem] object-cover shadow-2xl shadow-black/30"
            />
            <div className="absolute right-4 bottom-0 max-w-xs rounded-3xl border border-white/10 bg-white/95 p-5 text-navy shadow-2xl">
              <p className="text-xs font-bold tracking-widest text-brand uppercase">
                China support
              </p>
              <p className="mt-2 text-xl font-black">Visa. Flights. Hotels. Suppliers. Shipping.</p>
            </div>
            <div className="absolute top-24 left-6 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur">
              Guangzhou markets
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-white py-8">
        <div className="flex w-max animate-marquee-left gap-4 px-4">
          {[...movingImages, ...movingImages].map((src, index) => (
            <img
              key={`${src}-${index}`}
              src={src}
              alt="China market, warehouse, and cargo service"
              className="h-36 w-56 rounded-3xl object-cover shadow-sm sm:h-44 sm:w-72"
            />
          ))}
        </div>
      </section>

      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-xs font-bold tracking-widest text-brand uppercase">
              What VoltCargo arranges
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
              One page for travelling to China, buying in China, and shipping to Ghana.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-navy/55">
              Clients can use this service whether they want to physically come to China or ask
              VoltCargo to source products on their behalf.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {serviceGroups.map((service) => (
              <ServiceGroupCard key={service.title} {...service} />
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-xs font-bold tracking-widest text-brand uppercase">
                Travel services
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
                Arrive prepared. Move with confidence.
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-navy/55">
              China can be overwhelming when you do not know the right city, market, supplier,
              hotel, or route. VoltCargo helps you organize the business side of the trip so you can
              focus on buying well.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {travelServices.map((service) => (
              <div
                key={service.title}
                className="group rounded-[2rem] border border-navy/5 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/10"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <service.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy/55">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="relative">
            <img
              src={chinaImg}
              alt="China business district"
              className="aspect-[4/5] rounded-[2.5rem] object-cover shadow-2xl shadow-navy/10"
            />
            <div className="absolute -right-4 bottom-10 rounded-3xl bg-navy p-5 text-white shadow-2xl sm:-right-8">
              <p className="text-xs font-bold tracking-widest text-white/40 uppercase">Trip flow</p>
              <p className="mt-1 text-2xl font-black">From airport to warehouse</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest text-brand uppercase">How it works</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
              One team for your buying trip and your cargo.
            </h2>
            <div className="mt-8 space-y-4">
              {tripPlan.map((item, index) => (
                <div key={item} className="flex gap-4 rounded-3xl bg-surface p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <p className="pt-2 text-sm leading-relaxed font-semibold text-navy/70">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="categories" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="text-xs font-bold tracking-widest text-brand uppercase">
              Product sourcing
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
              Can’t come to China yet? VoltCargo can source for you too.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-navy/55">
              Send what you need and we help check supplier options, pricing, samples, quantities,
              and shipping method. These are some of the product groups we can support.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {sourcingCategories.map((category) => (
              <div
                key={category.name}
                className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-navy shadow-sm"
              >
                <img
                  src={category.img}
                  alt={category.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <h3 className="text-base font-bold text-white sm:text-lg">{category.name}</h3>
                  <p className="mt-1 text-xs text-white/75 sm:text-sm">{category.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy px-6 py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          <ProcessCard
            icon={SearchCheck}
            title="Find the right supplier"
            desc="We help compare supplier options, product photos, minimum order quantities, pricing, and credibility."
          />
          <ProcessCard
            icon={ShieldCheck}
            title="Check before shipment"
            desc="Goods can be received at our China warehouse for photos, counts, and basic quality checks before export."
          />
          <ProcessCard
            icon={PackageCheck}
            title="Consolidate and ship"
            desc="We combine goods from multiple suppliers and move them by air or ocean freight to Ghana."
          />
        </div>
      </section>

      <section className="bg-white px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-bold tracking-widest text-brand uppercase">In China</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
              Markets, factories, warehouses, and real cargo movement.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-navy/55">
              Whether you are coming to meet suppliers yourself or asking VoltCargo to source for
              you, the goal is the same: reduce guesswork, protect your money, and move the right
              goods to Ghana.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <InfoPill icon={MapPinned} label="Market visit planning" />
              <InfoPill icon={Building2} label="Factory and showroom visits" />
              <InfoPill icon={CalendarCheck} label="Business trip scheduling" />
              <InfoPill icon={PackageCheck} label="Cargo receiving and dispatch" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[showcase1, showcase2, qcImg, consImg].map((src, index) => (
              <img
                key={`${src}-${index}`}
                src={src}
                alt="VoltCargo China service process"
                className="aspect-square rounded-3xl object-cover shadow-sm"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-brand p-8 text-white shadow-2xl shadow-brand/20 lg:p-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-bold tracking-widest text-white/60 uppercase">
                Ready for China?
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight lg:text-5xl">
                Tell us what you want to buy or when you want to travel.
              </h2>
              <p className="mt-4 max-w-2xl text-white/75">
                VoltCargo will help you understand the next step: sourcing remotely, planning a
                China visit, inspecting goods, or shipping what you already bought.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand transition-colors hover:bg-white/90"
              >
                Chat on WhatsApp <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ServiceGroupCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-navy/5 bg-surface p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/10">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/10 blur-2xl" />
      <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="relative text-2xl font-black">{title}</h3>
      <p className="relative mt-3 text-sm leading-relaxed text-navy/55">{desc}</p>
    </div>
  );
}

function ProcessCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur transition-colors hover:bg-white/10">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/60">{desc}</p>
    </div>
  );
}

function InfoPill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-navy/5 bg-surface p-4 text-sm font-bold text-navy/70">
      <Icon className="h-5 w-5 text-brand" />
      {label}
    </div>
  );
}
