// The root layout (src/app/layout.tsx) sets `dir="rtl"` / `lang="ar"` and the
// Cairo font for the Marketing Plan app — this segment is a second, unrelated
// product, so it opts back out to LTR/English with the platform default font
// rather than touching the shared root layout.
export default function SaasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" lang="en" className="font-sans text-slate-900">
      {children}
    </div>
  );
}
