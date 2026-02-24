'use client';

import { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { authApi } from '../../lib/api';
import { useToast } from '../../lib/toast-context';
import { SkeletonCard } from '../../components/skeleton';

const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(
    user?.emailNotificationsEnabled ?? true,
  );
  const [notifLoading, setNotifLoading] = useState(false);

  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError('');
    setProfileLoading(true);

    try {
      const response = await authApi.updateMe({ name });
      updateUser(response.user);
      toast.show('Profile updated successfully');
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

  async function handleEmailNotificationsToggle() {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);
    setNotifLoading(true);

    try {
      const response = await authApi.updateMe({ emailNotificationsEnabled: newValue });
      updateUser(response.user);
    } catch {
      setEmailNotifications(!newValue); // revert
    } finally {
      setNotifLoading(false);
    }
  }

  async function handleSendPhoneCode(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError('');

    if (!PHONE_REGEX.test(phone)) {
      setPhoneError('Invalid phone number. Must be E.164 format (e.g., +15551234567)');
      return;
    }

    setPhoneLoading(true);
    try {
      await authApi.sendPhoneCode(phone);
      setPhoneCodeSent(true);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError('');
    setPhoneLoading(true);

    try {
      await authApi.verifyPhone(phoneCode);
      updateUser({ ...user!, phone, phoneVerified: true });
      toast.show('Phone number verified successfully');
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to verify phone');
    } finally {
      setPhoneLoading(false);
    }
  }

  if (!user) {
    return <div className="p-6"><SkeletonCard /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl">Account Settings</h1>

      <div className="mac-window mb-6">
        <div className="mac-window-title">
          <span>Profile</span>
        </div>
        <div className="mac-window-body space-y-4">
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

      <div className="mac-window mb-6">
        <div className="mac-window-title">
          <span>Notifications</span>
        </div>
        <div className="mac-window-body space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={handleEmailNotificationsToggle}
              disabled={notifLoading}
              className="h-4 w-4 border-2 border-black"
            />
            <span className="font-mono text-sm">Email Notifications</span>
          </label>
          <p className="font-mono text-xs">
            When enabled, you will receive email notifications for approvals, script uploads, and team invites.
          </p>
        </div>
      </div>

      <div className="mac-window mb-6">
        <div className="mac-window-title">
          <span>Phone Verification</span>
        </div>
        <div className="mac-window-body space-y-4">
          {user.phoneVerified && user.phone ? (
            <div className="space-y-2">
              <p className="font-mono text-sm">{user.phone}</p>
              <span className="badge badge-approved">VERIFIED</span>
            </div>
          ) : phoneCodeSent ? (
            <form onSubmit={handleVerifyPhone} className="space-y-4">
              {phoneError && (
                <div role="alert" className="mac-alert-error p-3 text-sm">
                  {phoneError}
                </div>
              )}
              <div>
                <label htmlFor="phoneCode" className="block text-sm text-black">
                  Verification Code
                </label>
                <input
                  id="phoneCode"
                  type="text"
                  required
                  maxLength={6}
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                  className="mt-1 block w-full border-2 border-black px-3 py-2"
                  placeholder="123456"
                />
              </div>
              <button
                type="submit"
                disabled={phoneLoading}
                className="mac-btn-primary disabled:opacity-50"
              >
                {phoneLoading ? 'Verifying...' : 'Verify Phone'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSendPhoneCode} className="space-y-4">
              {phoneError && (
                <div role="alert" className="mac-alert-error p-3 text-sm">
                  {phoneError}
                </div>
              )}
              <div>
                <label htmlFor="phone" className="block text-sm text-black">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full border-2 border-black px-3 py-2"
                  placeholder="+15551234567"
                />
              </div>
              <button
                type="submit"
                disabled={phoneLoading}
                className="mac-btn-primary disabled:opacity-50"
              >
                {phoneLoading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          )}
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
