import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { GoogleAnalytics } from '@next/third-parties/google';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Paptrix— Professional Question Paper Formatter',
  description:
    'Turn handwritten notes and scanned PDFs into beautifully formatted exam papers. Powered by Claude AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
      <GoogleAnalytics gaId="G-W9QJVELBFJ" />
    </html>
  );
}