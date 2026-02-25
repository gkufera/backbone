import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { AppHeader } from '../components/app-header';
import { AppFooter } from '../components/app-footer';
import { ToastContainer } from '../components/toast-container';

const vt323 = localFont({
  src: '../fonts/VT323-Regular.woff2',
  variable: '--font-vt323',
  weight: '400',
});

const courierPrime = localFont({
  src: [
    { path: '../fonts/CourierPrime-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/CourierPrime-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-courier-prime',
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
          <main className="flex-1 px-4">{children}</main>
          <AppFooter />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
