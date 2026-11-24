import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MessagesSquare, Ticket as TicketIcon } from 'lucide-react';
import { api } from '../../lib/api';
import { PaginationBar } from '../../components/PaginationBar';

interface ConversationRow {
  id: string;
  subject: string;
  lastMessageAt: string;
  ticket: { id: string; ticketNumber: string; title: string; status: string } | null;
  messages: Array<{ fromEmail: string; fromName: string | null; bodyPreview: string | null }>;
  _count: { messages: number };
}

export default function EmailConversationsPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<{
          success: boolean;
          data: {
            items: ConversationRow[];
            pagination: { page: number; limit: number; total: number; totalPages: number };
          };
        }>('/emails/conversations', { params: { page, limit } });
        setConversations(res.data.data.items);
        setTotal(res.data.data.pagination.total);
        setTotalPages(res.data.data.pagination.totalPages);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [page, limit]);

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Email Management
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1">
          Email Conversations
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Tracked Outlook conversation threads and their linked TicketSphere tickets.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-12 text-center text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-blue-500" />
          Loading conversations...
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] p-12 text-center text-zinc-400 space-y-2">
          <MessagesSquare className="h-8 w-8 mx-auto text-zinc-400" />
          <p className="text-sm">No synced email conversations yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-[#141821] overflow-hidden shadow-2xs">
          <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
            {conversations.map((c) => {
              const latest = c.messages[0];
              return (
                <div key={c.id} className="ts-row-hover p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                        {c.subject}
                      </span>
                      <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500">
                        {c._count.messages} msgs
                      </span>
                    </div>
                    {latest && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                        {latest.fromName || latest.fromEmail}: {latest.bodyPreview}
                      </p>
                    )}
                  </div>

                  {c.ticket ? (
                    <Link
                      to={`/tickets/${c.ticket.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30 px-3 py-1.5 text-xs font-semibold"
                    >
                      <TicketIcon className="h-3.5 w-3.5" />
                      {c.ticket.ticketNumber}
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-400">Unlinked</span>
                  )}
                </div>
              );
            })}
          </div>

          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
