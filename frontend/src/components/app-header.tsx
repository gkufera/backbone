'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserNav } from './user-nav';

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b-2 border-black bg-white px-4 py-2">
      <Link href="/">
        <Image
          src="/logo.png"
          alt="Slug Max"
          width={120}
          height={34}
          priority
          unoptimized
          style={{ imageRendering: 'pixelated' }}
        />
      </Link>
      <UserNav />
    </header>
  );
}
