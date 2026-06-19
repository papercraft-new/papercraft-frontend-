import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'Paptrix — AI Question Paper Generator for Indian Teachers',

  description:
    'Paptrix converts handwritten notes and scanned PDFs into professional exam papers in 30 seconds. Free for CBSE, ICSE and State Board teachers.',

  metadataBase: new URL('https://paptrix.netlify.app'),

  openGraph: {
    title: 'Paptrix — AI Question Paper Generator',
    description:
      'Turn handwritten notes into professional exam papers in 30 seconds.',

    url: 'https://paptrix.netlify.app',

    siteName: 'Paptrix',

    type: 'website',
  },

  verification: {
    google: 'vVUQJ2C_wPXDmzn5ldazibwZk0rRCQ8x7CBeLvou9nc',
  },

  robots: {
    index: true,
    follow: true,
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
    </html>
  );
}