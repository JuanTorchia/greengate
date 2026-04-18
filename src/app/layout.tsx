import type { Metadata } from "next";
import "./globals.css";
import { sora, inter, poppins, jetbrainsMono } from "./fonts";

export const metadata: Metadata = {
  title: "GreenGate — Embodied carbon audits, human-signed",
  description:
    "Agent-driven embodied-carbon audit for construction BOMs, with Auth0 CIBA-bound human approvals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${inter.variable} ${poppins.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased bg-canvas text-ink">{children}</body>
    </html>
  );
}
