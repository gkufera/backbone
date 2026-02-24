'use client';

import { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { authApi } from '../../lib/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileMessage('');
    setProfileLoading(true);

    try {
      const response = await authApi.updateMe({ name });
      updateUser(response.user);
      setProfileMessage('Profile updated successfully');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      await authApi.updateMe({ currentPassword, newPassword });
      setPasswordMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  }

  if (!user) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl">Account Settings</h1>

      <div className="mac-window mb-6">
        <div className="mac-window-title">
          <span>Profile</span>
        </div>
        <div className="mac-window-body space-y-4">
          {profileMessage && (
            <div className="mac-alert p-3 text-sm font-mono">{profileMessage}</div>
          )}
          {profileError && (
            <div role="alert" className="mac-alert-error p-3 text-sm">
              {profileError}
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm text-black">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border-2 border-black px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm text-black">Email</label>
              <p className="mt-1 font-mono text-sm">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm text-black">Email Status</label>
              <span className={`badge ${user.emailVerified ? 'badge-approved' : 'badge-outstanding'}`}>
                {user.emailVerified ? 'VERIFIED' : 'NOT VERIFIED'}
              </span>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="mac-btn-primary disabled:opacity-50"
            >
              {profileLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>

      <div className="mac-window">
        <div className="mac-window-title">
          <span>Change Password</span>
        </div>
        <div className="mac-window-body space-y-4">
          {passwordMessage && (
            <div className="mac-alert p-3 text-sm font-mono">{passwordMessage}</div>
          )}
          {passwordError && (
            <div role="alert" className="mac-alert-error p-3 text-sm">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm text-black">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full border-2 border-black px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm text-black">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full border-2 border-black px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm text-black">
                Confirm New Password
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="mt-1 block w-full border-2 border-black px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="mac-btn-primary disabled:opacity-50"
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
