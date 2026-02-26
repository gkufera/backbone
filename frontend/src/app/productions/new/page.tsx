'use client';

import { useState } from 'react';
import { productionsApi } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

export default function NewProductionPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [studioName, setStudioName] = useState('');
  const [budget, setBudget] = useState('');
  const [contactName, setContactName] = useState(user?.name ?? '');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!title.trim() || !studioName.trim() || !contactName.trim() || !contactEmail.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await productionsApi.create({
        title: title.trim(),
        studioName: studioName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        budget: budget.trim() || undefined,
      });
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="mac-window">
          <div className="mac-window-title">
            <span>Request Submitted</span>
          </div>
          <div className="mac-window-body space-y-4">
            <p className="font-mono text-sm">
              Your request has been submitted. You&apos;ll receive an email when approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-2xl">Request a Production</h1>
      <p className="mb-6 text-sm font-mono">
        Your request will be reviewed by our sales team.
      </p>

      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm">
            Production Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full border-2 border-black p-2"
            required
          />
        </div>

        <div>
          <label htmlFor="studioName" className="block text-sm">
            Studio Name
          </label>
          <input
            id="studioName"
            type="text"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            className="mt-1 w-full border-2 border-black p-2"
            required
          />
        </div>

        <div>
          <label htmlFor="budget" className="block text-sm">
            Budget
          </label>
          <input
            id="budget"
            type="text"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="mt-1 w-full border-2 border-black p-2"
          />
        </div>

        <div>
          <label htmlFor="contactName" className="block text-sm">
            Your Name
          </label>
          <input
            id="contactName"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="mt-1 w-full border-2 border-black p-2"
            required
          />
        </div>

        <div>
          <label htmlFor="contactEmail" className="block text-sm">
            Contact Email
          </label>
          <input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-1 w-full border-2 border-black p-2"
            required
          />
        </div>

        {error && (
          <div role="alert" className="text-sm text-black font-bold">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mac-btn-primary disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
