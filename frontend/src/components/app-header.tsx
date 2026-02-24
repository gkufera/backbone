'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserNav } from './user-nav';
import { NotificationBell } from './notification-bell';
import { productionsApi } from '../lib/api';

function useProductionFromPath() {
  const pathname = usePathname();
  const match = pathname.match(/^\/productions\/([^/]+)/);
  const productionId = match ? match[1] : null;

  const [productionName, setProductionName] = useState<string | null>(null);

  useEffect(() => {
    if (!productionId) {
      setProductionName(null);
      return;
    }
    productionsApi
      .get(productionId)
      .then((data) => setProductionName(data.production.title))
      .catch(() => setProductionName(null));
  }, [productionId]);

  return { productionId, productionName };
}

export function AppHeader() {
  const { productionId, productionName } = useProductionFromPath();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <header className="border-b-2 border-black bg-white">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          {pathname !== '/' ? (
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
          ) : (
            <Link href="/" className="text-lg font-bold">SLUG MAX</Link>
          )}
          {productionId && productionName && (
            <>
              <span className="text-lg font-mono">/</span>
              <Link
                href={`/productions/${productionId}`}
                className="text-sm font-mono font-bold"
              >
                {productionName}
              </Link>
            </>
          )}
        </div>
        <div className="hidden lg:flex items-center gap-2">
          {productionId && <NotificationBell productionId={productionId} />}
          <UserNav />
        </div>
        <button
          aria-label="Menu"
          className="lg:hidden px-2 py-1"
          onClick={() => setMobileNavOpen((prev) => !prev)}
        >
          <div className="flex flex-col gap-1">
            <span className="block h-0 w-5 border-t-2 border-black" />
            <span className="block h-0 w-5 border-t-2 border-black" />
            <span className="block h-0 w-5 border-t-2 border-black" />
          </div>
        </button>
      </div>
      {mobileNavOpen && (
        <div data-testid="mobile-nav" className="lg:hidden border-t-2 border-black px-4 py-3">
          <div className="flex items-center gap-2">
            {productionId && <NotificationBell productionId={productionId} />}
            <UserNav />
          </div>
        </div>
      )}
    </header>
  );
}
