import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GreenGate",
  description:
    "Agent-driven embodied-carbon audit for construction BOMs, with human-in-the-loop approvals.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
