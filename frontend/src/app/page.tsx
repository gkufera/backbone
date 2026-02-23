'use client';

import Link from 'next/link';
import { UserNav } from '../components/user-nav';
import { useAuth } from '../lib/auth-context';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex justify-end p-4">
        <UserNav />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">Slug Max</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Production collaboration platform
        </p>
        {!isLoading && isAuthenticated && (
          <Link
            href="/productions"
            className="mt-4 rounded bg-black px-6 py-2 text-white dark:bg-white dark:text-black"
          >
            My Productions
          </Link>
        )}
        {!isLoading && !isAuthenticated && (
          <div className="mt-4 flex gap-3">
            <Link
              href="/login"
              className="rounded bg-black px-6 py-2 text-white dark:bg-white dark:text-black"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded border border-zinc-300 px-6 py-2 text-black dark:border-zinc-700 dark:text-white"
            >
              Sign up
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
