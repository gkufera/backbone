'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  productionsApi,
  departmentsApi,
  feedApi,
  type ProductionDetailResponse,
  type DepartmentResponse,
} from '../../../lib/api';
import { PermissionsTooltip } from '../../../components/permissions-tooltip';
import { SkeletonCard } from '../../../components/skeleton';
import { useToast } from '../../../lib/toast-context';

export default function ProductionDashboard() {
  const params = useParams();
  const id = params.id as string;

  const [production, setProduction] = useState<ProductionDetailResponse | null>(null);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberTitle, setMemberTitle] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [feedPendingCount, setFeedPendingCount] = useState<number>(0);
  const [elementStats, setElementStats] = useState<{
    pending: number;
    outstanding: number;
    approved: number;
    total: number;
  } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    Promise.all([
      productionsApi.get(id),
      departmentsApi.list(id),
      feedApi.list(id),
      productionsApi.getElementStats(id).catch(() => null),
    ])
      .then(([prodData, deptData, feedData, statsData]) => {
        setProduction(prodData.production);
        setDepartments(deptData.departments);
        setFeedPendingCount(feedData.elements.length);
        if (statsData) setElementStats(statsData);
      })
      .catch(() => setError('Failed to load production'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();

    try {
      await productionsApi.addMember(id, memberEmail, memberTitle || undefined);
      setMemberEmail('');
      setMemberTitle('');
      const data = await productionsApi.get(id);
      setProduction(data.production);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to add member', 'error');
    }
  }

  async function handleCreateDepartment(e: React.FormEvent) {
    e.preventDefault();

    try {
      await departmentsApi.create(id, newDeptName);
      setNewDeptName('');
      const deptData = await departmentsApi.list(id);
      setDepartments(deptData.departments);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to create department', 'error');
    }
  }

  const canManageRoles =
    production?.memberRole === 'ADMIN' || production?.memberRole === 'DECIDER';

  async function handleSaveTitle() {
    if (!editTitle.trim() || !production) return;
    setTitleError('');
    try {
      const { production: updated } = await productionsApi.update(id, { title: editTitle.trim() });
      setProduction({ ...production, title: updated.title });
      setIsEditingTitle(false);
    } catch (err) {
      setTitleError(err instanceof Error ? err.message : 'Failed to update title');
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    try {
      await productionsApi.updateMemberRole(id, memberId, newRole);
      const data = await productionsApi.get(id);
      setProduction(data.production);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to update role', 'error');
    }
  }

  async function handleDepartmentChange(memberId: string, departmentId: string | null) {
    try {
      await productionsApi.updateMemberDepartment(id, memberId, departmentId);
      const data = await productionsApi.get(id);
      setProduction(data.production);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to update department', 'error');
    }
  }

  async function handleDepartmentColorChange(departmentId: string, color: string) {
    try {
      await departmentsApi.update(id, departmentId, { color });
      setDepartments((prev) =>
        prev.map((d) => (d.id === departmentId ? { ...d, color } : d)),
      );
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to update color', 'error');
    }
  }

  async function handleDeleteDepartment(departmentId: string) {
    if (!window.confirm('Delete this department?')) return;
    try {
      await departmentsApi.delete(id, departmentId);
      setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Failed to delete department', 'error');
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-black font-bold">{error}</div>;
  }

  if (!production) {
    return <div className="p-6">Production not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {isEditingTitle ? (
            <input
              className="text-3xl border-2 border-black px-2 py-1 w-full"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') {
                  setTitleError('');
                  setIsEditingTitle(false);
                }
              }}
              onBlur={handleSaveTitle}
              autoFocus
            />
          ) : (
            <h1
              className={`text-3xl ${canManageRoles ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (canManageRoles) {
                  setTitleError('');
                  setEditTitle(production.title);
                  setIsEditingTitle(true);
                }
              }}
            >
              {production.title}
            </h1>
          )}
        </div>
        {titleError && (
          <p role="alert" className="mt-2 text-sm text-black font-bold">
            {titleError}
          </p>
        )}
      </div>
      {production.description && <p className="mb-6 font-mono text-black">{production.description}</p>}

      {/* Scripts */}
      <section className="mac-window mb-8">
        <div className="mac-window-title">
          <span>Scripts</span>
        </div>
        <div className="mac-window-body">
          <div className="mb-3 flex items-center justify-end">
            <Link
              href={`/productions/${id}/scripts/upload`}
              className="mac-btn-primary"
            >
              Upload Script
            </Link>
          </div>

          {production.scripts.length === 0 ? (
            <p className="text-black">No scripts uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-black">
              {production.scripts.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/productions/${id}/scripts/${s.id}`}
                    className="block py-3 hover:bg-black hover:text-white"
                  >
                    <span className="font-mono">{s.title}</span>
                    <span className="ml-2 text-xs uppercase">{s.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Review Feed */}
      <section className="mac-window mb-8">
        <div className="mac-window-title">
          <span>Review Feed</span>
        </div>
        <div className="mac-window-body">
          <p className="mb-3 font-mono text-sm">
            {feedPendingCount > 0
              ? `${feedPendingCount} elements pending review`
              : 'No elements pending review'}
          </p>
          <Link href={`/productions/${id}/feed`} className="mac-btn-primary">
            Review Feed
          </Link>
        </div>
      </section>

      {/* Element Status */}
      {elementStats && elementStats.total > 0 && (
        <section className="mac-window mb-8">
          <div className="mac-window-title">
            <span>Element Status</span>
          </div>
          <div className="mac-window-body">
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span className="badge badge-outstanding">PENDING</span>
                <span className="font-mono text-sm">{elementStats.pending}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-outstanding-review">OUTSTANDING</span>
                <span className="font-mono text-sm">{elementStats.outstanding}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-approved">APPROVED</span>
                <span className="font-mono text-sm">{elementStats.approved}</span>
              </div>
            </div>
            {elementStats.total > 0 && (
              <div className="border-2 border-black h-4 w-full">
                <div
                  className="bg-black h-full"
                  style={{
                    width: `${Math.round((elementStats.approved / elementStats.total) * 100)}%`,
                  }}
                />
              </div>
            )}
            <p className="mt-2 font-mono text-xs">
              {elementStats.approved} of {elementStats.total} elements approved
            </p>
          </div>
        </section>
      )}

      {/* Team Members */}
      <section className="mac-window mb-8">
        <div className="mac-window-title">
          <span>Team Members</span>
        </div>
        <div className="mac-window-body">
          <ul className="mb-4 divide-y divide-black">
            {production.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium font-mono">{m.user.name}</span>
                  {m.title && <span className="ml-2 text-sm font-mono text-black">&middot; {m.title}</span>}
                  <span className="ml-2 text-sm font-mono text-black">{m.user.email}</span>
                  {canManageRoles ? (
                    <div className="mt-1">
                      <select
                        value={m.department?.id ?? ''}
                        onChange={(e) => handleDepartmentChange(m.id, e.target.value || null)}
                        className="border-2 border-black px-2 py-1 text-xs"
                        aria-label={`Department for ${m.user.name}`}
                      >
                        <option value="">(NONE)</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    m.department && <div className="mt-1"><span className="text-xs font-mono">{m.department.name}</span></div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {canManageRoles ? (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="border-2 border-black px-2 py-1 text-xs uppercase text-black"
                        aria-label={`Role for ${m.user.name}`}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="DECIDER">DECIDER</option>
                        <option value="MEMBER">MEMBER</option>
                      </select>
                      <PermissionsTooltip role={m.role} />
                    </>
                  ) : (
                    <>
                      <span className="text-xs uppercase text-black">{m.role}</span>
                      <PermissionsTooltip role={m.role} />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddMember} className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email to invite"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="flex-1 border-2 border-black p-2"
              required
            />
            <input
              type="text"
              placeholder="Title (optional)"
              value={memberTitle}
              onChange={(e) => setMemberTitle(e.target.value)}
              className="w-40 border-2 border-black p-2"
            />
            <button type="submit" className="mac-btn-primary">
              Add Member
            </button>
          </form>
        </div>
      </section>

      {/* Departments */}
      <section className="mac-window mb-8">
        <div className="mac-window-title">
          <span>Departments</span>
        </div>
        <div className="mac-window-body">
          {departments.length === 0 ? (
            <p className="mb-4 text-black">No departments yet.</p>
          ) : (
            <ul className="mb-4 divide-y divide-black">
              {departments.map((dept) => {
                const memberCount = dept._count?.members ?? 0;
                return (
                  <li key={dept.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      {canManageRoles && (
                        <input
                          type="color"
                          value={dept.color ?? '#000000'}
                          onChange={(e) =>
                            handleDepartmentColorChange(dept.id, e.target.value)
                          }
                          aria-label={`Color for ${dept.name}`}
                          className="h-6 w-6 border-2 border-black cursor-pointer"
                        />
                      )}
                      <span className="font-medium font-mono">{dept.name}</span>
                      {memberCount > 0 && (
                        <span className="ml-2 text-sm font-mono text-black">
                          ({memberCount} member{memberCount !== 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                    {memberCount > 0 ? (
                      <span
                        className="btn-disabled-striped text-sm"
                        title="Cannot delete department with members"
                      >
                        Delete
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeleteDepartment(dept.id)}
                        className="btn-text text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleCreateDepartment} className="flex gap-2">
            <input
              type="text"
              placeholder="New department name"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="flex-1 border-2 border-black p-2"
              required
            />
            <button type="submit" className="mac-btn-primary">
              Add Department
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
