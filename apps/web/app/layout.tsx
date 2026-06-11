import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Payments Admin',
  description: 'Payment administration dashboard',
  robots: {follow: false, index: false}
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-zinc-950 text-zinc-100 antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
