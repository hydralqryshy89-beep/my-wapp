import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

// All pages read live data from the database on every request.
export const dynamic = "force-dynamic";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "Marketing Plan",
  description: "نظام إدارة الخطة التسويقية",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html dir="rtl" lang="ar" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar />
            <main className="flex-1 overflow-x-hidden p-4 pt-20 md:p-6 md:pt-6 lg:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
