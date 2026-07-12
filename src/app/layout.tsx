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

export const metadata = {
  title: 'Paptrix — AI Question Paper Generator for Indian Teachers',
  description: 'Paptrix helps Indian school and college teachers instantly create exam question papers using AI. Supports CBSE, ICSE, and State Boards.',
  keywords: ['Paptrix', 'question paper generator', 'AI exam paper maker', 'CBSE question paper', 'Indian teachers tool'],
  metadataBase: new URL('https://paptrix.in'),  // ← your actual domain
  verification: {
     google: '1aPVvbIfL938_TebvWtgL71xDk07WBenZ7hsaKFQiis',  // ← paste your code here
   },
  openGraph: {
    title: 'Paptrix — AI Question Paper Generator',
    description: 'Create exam papers in minutes with AI. Built for Indian teachers.',
    url: 'https://paptrix.in',
    siteName: 'Paptrix',
    type: 'website',
  },
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