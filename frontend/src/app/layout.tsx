import type { Metadata } from 'next';
import { VT323 } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const vt323 = VT323({
  weight: '400',
  variable: '--font-vt323',
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
      <body className={vt323.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
