import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Shield } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      await api.patch('/auth/me', {
        displayName,
        firstName: firstName || null,
        lastName: lastName || null,
        jobTitle: jobTitle || null,
        department: department || null,
      });
      await refreshUser();
      setSavedMsg('Profile updated successfully.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          Account
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
          My Profile
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal details and view assigned roles.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] px-3.5 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email ?? ''}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-[#090D16]/60 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] px-3.5 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] px-3.5 py-2 text-sm dark:text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Support Engineer"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] px-3.5 py-2 text-sm dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
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
                placeholder="e.g. IT Operations"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white dark:focus:bg-[#0B101B] dark:border-slate-800 dark:bg-[#090D16] px-3.5 py-2 text-sm dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {savedMsg && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 rounded-xl px-3.5 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{savedMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 transition inline-flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827] p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Assigned Roles &amp; Permissions
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {user?.roles.map((r) => (
            <span
              key={r.id}
              className="rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-400/25 px-3 py-1 text-xs font-semibold dark:text-indigo-300"
            >
              {r.name}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {user?.permissions.map((p) => (
            <span
              key={p}
              className="rounded-md border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-[#090D16] px-2 py-0.5 text-[11px] dark:text-slate-300 font-mono"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
