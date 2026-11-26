import type { Metadata } from "next";
import "./globals.css";

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Gary: Merchant of Asphodel",
  description:
    "A considered marketplace for trading cards, collectors, and the stories behind every find.",
  icons: {
    icon: "/brand-icon.png",
  },
  openGraph: {
    title: "Gary: Merchant of Asphodel",
    description:
      "A considered marketplace for trading cards, collectors, and the stories behind every find.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gary: Merchant of Asphodel",
    description:
      "A considered marketplace for trading cards, collectors, and the stories behind every find.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
