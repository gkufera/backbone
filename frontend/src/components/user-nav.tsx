'use client';

import { useAuth } from '../lib/auth-context';

export function UserNav() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{user?.name}</span>
      <button
        onClick={logout}
        className="rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        Log out
      </button>
    </div>
  );
}
