import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Edit2, Loader2, Plus, Search, UserCheck, UserX, X } from 'lucide-react';
import { api } from '../../lib/api';
import type { RoleWithPermissions, UserProfile } from '../../types/auth';

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get<{ success: boolean; data: UserProfile[] }>('/users', {
          params: search ? { search } : undefined,
        }),
        api.get<{ success: boolean; data: RoleWithPermissions[] }>('/roles'),
      ]);
      setUsers(usersRes.data.data);
      setRoles(rolesRes.data.data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingUser(null);
    setEmail('');
    setDisplayName('');
    setJobTitle('');
    setDepartment('');
    setPassword('');
    const defaultUserRole = roles.find((r) => r.name === 'User');
    setSelectedRoleIds(defaultUserRole ? [defaultUserRole.id] : []);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setEmail(u.email);
    setDisplayName(u.displayName);
    setJobTitle(u.jobTitle ?? '');
    setDepartment(u.department ?? '');
    setPassword('');
    setSelectedRoleIds(u.roles.map((r) => r.id));
    setError(null);
    setModalOpen(true);
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (selectedRoleIds.length === 0) {
      setError('Select at least one role.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, {
          displayName,
          jobTitle: jobTitle || null,
          department: department || null,
          ...(password ? { password } : {}),
          roleIds: selectedRoleIds,
        });
      } else {
        await api.post('/users', {
          email,
          displayName,
          jobTitle: jobTitle || undefined,
          department: department || undefined,
          ...(password ? { password } : {}),
          roleIds: selectedRoleIds,
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to save user'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (u: UserProfile) => {
    await api.patch(`/users/${u.id}/status`, { isActive: !u.isActive });
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Administration
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
            User Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create accounts, assign RBAC roles, and activate or deactivate access.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 transition shadow-md shadow-indigo-950/20 dark:shadow-indigo-950/50"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, department..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] pl-9 pr-3 py-2 text-sm dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 dark:bg-[#0D1321] text-[11px] font-semibold uppercase tracking-wider dark:text-slate-400 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Department / Title</th>
                <th className="px-5 py-3.5">Roles</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-indigo-600 dark:text-indigo-400" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900 dark:text-white">{u.displayName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                      <p>{u.department || '—'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{u.jobTitle || ''}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.map((r) => (
                          <span
                            key={r.id}
                            className="rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-400/20 px-2 py-0.5 text-xs font-medium dark:text-indigo-300"
                          >
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 px-2.5 py-1 text-xs font-medium dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleStatus(u)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          u.isActive
                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.isActive ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Activate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 dark:bg-[#111827] dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingUser ? 'Edit User' : 'Create User'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 px-3 py-2 text-xs dark:text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingUser)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white disabled:opacity-50 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  {editingUser ? 'New Password (leave blank to keep)' : 'Initial Password'}
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Assign Roles
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-[#090D16] px-3 py-2 text-sm dark:text-slate-200 cursor-pointer dark:hover:border-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                        className="rounded border-slate-300 dark:border-slate-700 dark:bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 px-4 py-2 text-sm font-medium dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
