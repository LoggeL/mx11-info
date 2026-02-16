import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MX11",
  description: "MX11 Services Dashboard",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
