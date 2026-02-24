'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserNav } from '../components/user-nav';
import { useAuth } from '../lib/auth-context';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex justify-end p-4">
        <UserNav />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="mac-window w-full max-w-md">
          <div className="mac-window-title">
            <span>Slug Max</span>
          </div>
          <div className="mac-window-body flex flex-col items-center gap-4 py-8">
            <Image
              src="/logo.png"
              alt="Slug Max"
              width={280}
              height={80}
              priority
              style={{ imageRendering: 'pixelated' }}
            />
            {!isLoading && isAuthenticated && (
              <Link href="/productions" className="mac-btn-primary mt-4">
                My Productions
              </Link>
            )}
            {!isLoading && !isAuthenticated && (
              <div className="mt-4 flex gap-3">
                <Link href="/login" className="mac-btn-primary">
                  Log in
                </Link>
                <Link href="/signup" className="mac-btn-secondary">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
