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

  async function handleDeleteDepartment(departmentId: string) {
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
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!production) {
    return <div className="p-6">Production not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-3xl font-bold">{production.title}</h1>
      {production.description && <p className="mb-6 text-zinc-500">{production.description}</p>}

      {/* Team Members */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Team Members</h2>
        <ul className="mb-4 space-y-2">
          {production.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <span className="font-medium">{m.user.name}</span>
                {m.title && <span className="ml-2 text-sm text-zinc-600">&middot; {m.title}</span>}
                <span className="ml-2 text-sm text-zinc-500">{m.user.email}</span>
                {m.departmentMembers && m.departmentMembers.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.departmentMembers.map((dm) => (
                      <span
                        key={dm.department.id}
                        className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                      >
                        {dm.department.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs uppercase text-zinc-400">{m.role}</span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleAddMember} className="flex gap-2">
          <input
            type="email"
            placeholder="Enter email to invite"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            className="flex-1 rounded border p-2"
            required
          />
          <input
            type="text"
            placeholder="Title (optional)"
            value={memberTitle}
            onChange={(e) => setMemberTitle(e.target.value)}
            className="w-40 rounded border p-2"
          />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Add Member
          </button>
        </form>
        {memberError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {memberError}
          </p>
        )}
      </section>

      {/* Departments */}
      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Departments</h2>
        {departments.length === 0 ? (
          <p className="mb-4 text-zinc-500">No departments yet.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {departments.map((dept) => (
              <li key={dept.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <span className="font-medium">{dept.name}</span>
                  {dept.members && dept.members.length > 0 && (
                    <span className="ml-2 text-sm text-zinc-500">
                      ({dept.members.length} member{dept.members.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteDepartment(dept.id)}
                  className="text-sm text-red-600 hover:text-red-800"
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
            className="flex-1 rounded border p-2"
            required
          />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Add Department
          </button>
        </form>
        {deptError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {deptError}
          </p>
        )}
      </section>

      {/* Review Feed */}
      <section className="mb-8">
        <Link
          href={`/productions/${id}/feed`}
          className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Review Feed
        </Link>
      </section>

      {/* Scripts */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Scripts</h2>
          <Link
            href={`/productions/${id}/scripts/upload`}
            className="rounded bg-black px-4 py-2 text-white"
          >
            Upload Script
          </Link>
        </div>

        {production.scripts.length === 0 ? (
          <p className="text-zinc-500">No scripts uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {production.scripts.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/productions/${id}/scripts/${s.id}`}
                  className="block rounded border p-3 hover:bg-zinc-50"
                >
                  <span className="font-medium">{s.title}</span>
                  <span className="ml-2 text-xs uppercase text-zinc-400">{s.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
