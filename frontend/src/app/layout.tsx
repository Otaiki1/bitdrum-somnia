import type { Metadata } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
});

const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: "BitDrum | Make the Call. Beat the Market.",
  description: "A premium Somnia-native Bitcoin prediction protocol powered by The Core.",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable} min-h-screen bg-[var(--bg-primary)] font-body text-[var(--text-primary)] antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
