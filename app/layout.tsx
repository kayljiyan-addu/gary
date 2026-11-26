import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gary: Merchant of Asphodel",
  description:
    "A considered marketplace for trading cards, collectors, and the stories behind every find.",
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
