'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export function UserNav() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-mono text-black">{user?.name}</span>
      <Link
        href="/settings"
        className="mac-btn-secondary px-3 py-1.5 text-sm font-medium"
      >
        Settings
      </Link>
      <button
        onClick={logout}
        className="mac-btn-secondary px-3 py-1.5 text-sm font-medium"
      >
        Log out
      </button>
    </div>
  );
}
