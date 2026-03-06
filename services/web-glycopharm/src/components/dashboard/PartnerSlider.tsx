const partners = ['GlucoseView', 'Partner A', 'Partner B', 'Partner C'];

export default function PartnerSlider() {
  return (
    <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <h2 className="text-sm font-semibold text-slate-500 text-center mb-6">파트너</h2>
      <div className="flex items-center justify-center gap-8 flex-wrap">
        {partners.map((name) => (
          <div
            key={name}
            className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <span className="text-xs text-slate-400 text-center leading-tight">{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
