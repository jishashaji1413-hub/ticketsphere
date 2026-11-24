import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FileText, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage, useToast } from '../../context/ToastContext';

interface EmailTemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isActive: boolean;
  updatedAt: string;
  createdBy?: { id: string; displayName: string } | null;
}

const PLACEHOLDERS = ['{{ticketNumber}}', '{{ticketTitle}}', '{{status}}', '{{assigneeName}}'];

export default function EmailTemplatesPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const canManage = hasPermission('emails.send');

  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplateItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: EmailTemplateItem[] }>(
        '/emails/templates',
        { params: { all: 'true' } }
      );
      setTemplates(res.data.data);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load email templates'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const openCreateModal = () => {
    setEditing(null);
    setName('');
    setCategory('General');
    setSubject('Re: [{{ticketNumber}}] {{ticketTitle}}');
    setBody('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (tpl: EmailTemplateItem) => {
    setEditing(tpl);
    setName(tpl.name);
    setCategory(tpl.category);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setIsActive(tpl.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, category, subject, body, isActive };
      if (editing) {
        await api.patch(`/emails/templates/${editing.id}`, payload);
        toast.success(`Template "${name}" updated.`);
      } else {
        await api.post('/emails/templates', payload);
        toast.success(`Template "${name}" created.`);
      }
      setModalOpen(false);
      await loadTemplates();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save email template'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tpl: EmailTemplateItem) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return;
    try {
      await api.delete(`/emails/templates/${tpl.id}`);
      toast.success(`Template "${tpl.name}" deleted.`);
      await loadTemplates();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete email template'));
    }
  };

  const categories = Array.from(new Set(templates.map((t) => t.category))).sort();
  const filtered = templates.filter((t) => {
    const matchesCat = !categoryFilter || t.category === categoryFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Email Management
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
            Email Templates
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Create reusable Outlook reply templates with dynamic ticket placeholders.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-500 hover:to-sky-500 transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-2xs">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates by name, subject, or body..."
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white dark:focus:bg-[#111215] dark:border-zinc-800 dark:bg-[#111215] pl-9 pr-3 py-1.5 text-sm dark:text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-[#111215] px-3 py-1.5 text-xs font-medium dark:text-zinc-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-12 text-center text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-500" />
          Loading email templates...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-12 text-center text-sm text-zinc-400">
          No email templates match your filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              className="ts-card-hover rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-5 flex flex-col justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {tpl.name}
                      </h3>
                      <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        {tpl.category}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      tpl.isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {tpl.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  Subject: {tpl.subject}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap line-clamp-4">
                  {tpl.body}
                </p>
              </div>

              {canManage && (
                <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(tpl)}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(tpl)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="animate-fade-in w-full max-w-lg rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#141821] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                {editing ? 'Edit Email Template' : 'New Email Template'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ticket Acknowledgement"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="General, Triage, Closure..."
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Body
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {PLACEHOLDERS.map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => setBody((b) => (b ? `${b} ${ph}` : ph))}
                        className="rounded bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-mono hover:bg-blue-100"
                      >
                        +{ph}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={6}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your template body..."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] px-3 py-2 text-xs text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                Active (visible in ticket reply template dropdown)
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
