'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  productionsApi,
  departmentsApi,
  type ProductionDetailResponse,
  type DepartmentResponse,
} from '../../../lib/api';
import { NotificationBell } from '../../../components/notification-bell';
import { PermissionsTooltip } from '../../../components/permissions-tooltip';

export default function ProductionDashboard() {
  const params = useParams();
  const id = params.id as string;

  const [production, setProduction] = useState<ProductionDetailResponse | null>(null);
  const [departments, setDepartments] = useState<DepartmentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberTitle, setMemberTitle] = useState('');
  const [memberError, setMemberError] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [deptError, setDeptError] = useState('');

  useEffect(() => {
    Promise.all([productionsApi.get(id), departmentsApi.list(id)])
      .then(([prodData, deptData]) => {
        setProduction(prodData.production);
        setDepartments(deptData.departments);
      })
      .catch(() => setError('Failed to load production'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberError('');

    try {
      await productionsApi.addMember(id, memberEmail, memberTitle || undefined);
      setMemberEmail('');
      setMemberTitle('');
      const data = await productionsApi.get(id);
      setProduction(data.production);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to add member');
    }
  }

  async function handleCreateDepartment(e: React.FormEvent) {
    e.preventDefault();
    setDeptError('');

    try {
      await departmentsApi.create(id, newDeptName);
      setNewDeptName('');
      const deptData = await departmentsApi.list(id);
      setDepartments(deptData.departments);
    } catch (err) {
      setDeptError(err instanceof Error ? err.message : 'Failed to create department');
    }
  }

  const canManageRoles =
    production?.memberRole === 'ADMIN' || production?.memberRole === 'DECIDER';

  async function handleRoleChange(memberId: string, newRole: string) {
    setMemberError('');
    try {
      await productionsApi.updateMemberRole(id, memberId, newRole);
      const data = await productionsApi.get(id);
      setProduction(data.production);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function handleDeleteDepartment(departmentId: string) {
    if (!window.confirm('Delete this department? All member assignments will be removed.')) return;
    try {
      await departmentsApi.delete(id, departmentId);
      setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
    } catch (err) {
      setDeptError(err instanceof Error ? err.message : 'Failed to delete department');
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-black font-bold">{error}</div>;
  }

  if (!production) {
    return <div className="p-6">Production not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">{production.title}</h1>
        <NotificationBell productionId={id} />
      </div>
      {production.description && <p className="mb-6 font-mono text-black">{production.description}</p>}

      {/* Team Members */}
      <section className="mac-window mb-8">
        <div className="mac-window-title">
          <span>
            Team Members
            {production.memberRole && (
              <PermissionsTooltip role={production.memberRole} />
            )}
          </span>
        </div>
        <div className="mac-window-body">
          <ul className="mb-4 divide-y divide-black">
            {production.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium font-mono">{m.user.name}</span>
                  {m.title && <span className="ml-2 text-sm font-mono text-black">&middot; {m.title}</span>}
                  <span className="ml-2 text-sm font-mono text-black">{m.user.email}</span>
                  {m.departmentMembers && m.departmentMembers.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.departmentMembers.map((dm) => (
                        <span
                          key={dm.department.id}
                          className="badge badge-default"
                        >
                          {dm.department.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {canManageRoles ? (
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
                ) : (
                  <span className="text-xs uppercase text-black">{m.role}</span>
                )}
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
          {memberError && (
            <p role="alert" className="mt-2 text-sm text-black font-bold">
              {memberError}
            </p>
          )}
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
              {departments.map((dept) => (
                <li key={dept.id} className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-medium font-mono">{dept.name}</span>
                    {dept.members && dept.members.length > 0 && (
                      <span className="ml-2 text-sm font-mono text-black">
                        ({dept.members.length} member{dept.members.length !== 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteDepartment(dept.id)}
                    className="btn-text text-sm hover:bg-black hover:text-white"
                  >
                    Delete
                  </button>
                </li>
              ))}
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
          {deptError && (
            <p role="alert" className="mt-2 text-sm text-black font-bold">
              {deptError}
            </p>
          )}
        </div>
      </section>

      {/* Review Feed */}
      <section className="mb-8">
        <Link href={`/productions/${id}/feed`} className="mac-btn-primary">
          Review Feed
        </Link>
      </section>

      {/* Scripts */}
      <section className="mac-window">
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
                    <span className="font-medium">{s.title}</span>
                    <span className="ml-2 text-xs uppercase">{s.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
