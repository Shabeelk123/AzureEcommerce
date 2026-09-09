import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AuthRefresh } from "@/components/auth-refresh";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AzureHijabs — Everyday & Premium Hijabs",
    template: "%s | AzureHijabs",
  },
  description:
    "Everyday and premium hijabs in jersey, chiffon, modal, and satin — designed for all-day comfort.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <AuthRefresh />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
