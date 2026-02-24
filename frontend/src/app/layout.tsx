import type { Metadata } from 'next';
import { VT323, Courier_Prime } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppHeader } from '../components/app-header';
import { AppFooter } from '../components/app-footer';

const vt323 = VT323({
  weight: '400',
  variable: '--font-vt323',
  subsets: ['latin'],
});

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  variable: '--font-courier-prime',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Slug Max',
  description: 'Production collaboration platform for film and TV',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white text-black">
      <body className={`${vt323.variable} ${courierPrime.variable} flex min-h-screen flex-col`}>
        <Providers>
          <AppHeader />
          <main className="flex-1">{children}</main>
          <AppFooter />
        </Providers>
      </body>
    </html>
  );
}
