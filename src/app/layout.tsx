import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GARY | Merchant of Asphodel",
  description: "A local trading card marketplace for collectors.",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
