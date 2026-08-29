import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

// All pages read live data from the database on every request.
export const dynamic = "force-dynamic";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "نظام إدارة الأكاديمية",
  description: "نظام إدارة أكاديمية تدريب حضورية",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html dir="rtl" lang="ar" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  );
}
