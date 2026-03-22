import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BitDrum | Intelligent Prediction Protocol",
  description: "Next-generation decentralized prediction protocol on Starknet.",
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#0a0a0a]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
