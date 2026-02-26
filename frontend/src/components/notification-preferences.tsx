'use client';

import { useState, useEffect } from 'react';
import {
  notificationPreferencesApi,
  type NotificationPreferenceResponse,
} from '../lib/api';

const CATEGORIES = [
  { field: 'optionEmails' as const, label: 'Options' },
  { field: 'approvalEmails' as const, label: 'Approvals' },
  { field: 'noteEmails' as const, label: 'Notes' },
  { field: 'scriptEmails' as const, label: 'Scripts' },
  { field: 'memberEmails' as const, label: 'Members' },
];

interface NotificationPreferencesProps {
  productionId: string;
}

export function NotificationPreferences({ productionId }: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState<NotificationPreferenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    notificationPreferencesApi
      .get(productionId)
      .then((data) => setPrefs(data.preferences))
      .catch(() => setError('Failed to load notification preferences'))
      .finally(() => setLoading(false));
  }, [productionId]);

  async function handleToggle(field: keyof NotificationPreferenceResponse) {
    if (!prefs) return;

    const oldValue = prefs[field];
    const newValue = !oldValue;

    // Optimistic update
    setPrefs({ ...prefs, [field]: newValue });

    try {
      const { preferences } = await notificationPreferencesApi.update(productionId, {
        [field]: newValue,
      });
      setPrefs(preferences);
    } catch {
      // Revert on error
      setPrefs({ ...prefs, [field]: oldValue });
      setError('Failed to update preference');
    }
  }

  if (loading) {
    return (
      <section className="mac-window mb-8">
        <div className="mac-window-title">
          <span>Email Notifications</span>
        </div>
        <div className="mac-window-body">
          <p className="font-mono text-sm">Loading...</p>
        </div>
      </section>
    );
  }

  if (error && !prefs) {
    return (
      <section className="mac-window mb-8">
        <div className="mac-window-title">
          <span>Email Notifications</span>
        </div>
        <div className="mac-window-body">
          <p className="font-mono text-sm font-bold">{error}</p>
        </div>
      </section>
    );
  }

  if (!prefs) return null;

  return (
    <section className="mac-window mb-8">
      <div className="mac-window-title">
        <span>Email Notifications</span>
      </div>
      <div className="mac-window-body space-y-3">
        <p className="font-mono text-xs">
          Choose which email notifications you receive for this production.
        </p>
        {error && <p className="font-mono text-xs font-bold">{error}</p>}
        {CATEGORIES.map(({ field, label }) => (
          <label key={field} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={prefs[field] as boolean}
              onChange={() => handleToggle(field)}
              className="h-4 w-4 border-2 border-black"
            />
            <span className="font-mono text-sm">{label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
