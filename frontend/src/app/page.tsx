'use client';

import { UserNav } from '../components/user-nav';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <header className="flex justify-end p-4">
        <UserNav />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-white">Backbone</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Production collaboration platform
        </p>
      </main>
    </div>
  );
}
