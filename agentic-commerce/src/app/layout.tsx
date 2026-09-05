import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GlowCart",
  description: "Guided skincare shopping with merchant-configured growth guardrails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
