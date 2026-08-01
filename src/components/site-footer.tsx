export function SiteFooter() {
  return (
    <footer className="bg-navy px-6 py-20 text-white" id="contact">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 border-b border-white/10 pb-20 md:grid-cols-4">
          <div className="col-span-2">
            <img
              src="/src/assets/logo.png"
              alt="Logo"
              className="h-9 w-28 mb-4 flex items-center"
            />
            <p className="mb-8 max-w-sm text-white/60">
              VoltCargo is building the future of African logistics. We connect global supply chains
              with enterprise-grade technology and reliability.
            </p>
            <div className="space-y-2 text-sm text-white/70">
              <p>WhatsApp: +233 24 000 0000</p>
              <p>Email: voltscargo@gmail.com</p>
              <p>Head Office: Accra, Ghana</p>
            </div>
          </div>
          <div>
            <h5 className="mb-6 font-bold">Services</h5>
            <ul className="space-y-4 text-sm text-white/60">
              <li>Air Freight</li>
              <li>Ocean Freight</li>
              <li>Customs Clearance</li>
              <li>Warehouse QC</li>
              <li>Cargo Insurance</li>
            </ul>
          </div>
          <div>
            <h5 className="mb-6 font-bold">Company</h5>
            <ul className="space-y-4 text-sm text-white/60">
              <li>About Us</li>
              <li>Contact</li>
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs font-medium text-white/40 md:flex-row">
          <p>© {new Date().getFullYear()} VoltCargo Logistics Group. All rights reserved.</p>
          <p>Payments secured by Paystack</p>
        </div>
      </div>
    </footer>
  );
}
