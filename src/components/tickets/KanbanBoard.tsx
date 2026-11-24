import { useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { GripVertical, MessageSquare, Paperclip, Route } from 'lucide-react';
import {
  ALL_STATUSES,
  PriorityBadge,
  STATUS_LABELS,
  StatusBadge,
} from './TicketBadges';
import type { TicketStatus, TicketSummary } from '../../types/ticket';

interface KanbanBoardProps {
  tickets: TicketSummary[];
  currentUserId?: string;
  canUpdateAll: boolean;
  readOnly?: boolean;
  onStatusChange: (ticketId: string, nextStatus: TicketStatus) => Promise<void>;
  onTrackTicket?: (ticket: TicketSummary) => void;
}

const COLUMN_TOP_ACCENT: Record<TicketStatus, string> = {
  NOT_STARTED: 'border-t-zinc-400 dark:border-t-zinc-500',
  IN_PROGRESS: 'border-t-blue-500',
  PENDING: 'border-t-amber-500',
  COMPLETED: 'border-t-emerald-500',
  CANCELLED: 'border-t-rose-500',
};

export function KanbanBoard({
  tickets,
  currentUserId,
  canUpdateAll,
  readOnly = false,
  onStatusChange,
  onTrackTicket,
}: KanbanBoardProps) {
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TicketStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const draggedTicket = draggedTicketId
    ? tickets.find((t) => t.id === draggedTicketId) ?? null
    : null;

  const canMoveTicket = (ticket: TicketSummary) =>
    !readOnly &&
    (canUpdateAll ||
      ticket.assignee?.id === currentUserId ||
      ticket.reporter.id === currentUserId);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, ticket: TicketSummary) => {
    if (!canMoveTicket(ticket)) {
      e.preventDefault();
      return;
    }
    setDraggedTicketId(ticket.id);
    e.dataTransfer.setData('text/plain', ticket.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTicketId(null);
    setDragOverStatus(null);
  };

  const handleColumnDragOver = (e: DragEvent<HTMLDivElement>, colStatus: TicketStatus) => {
    if (!draggedTicketId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== colStatus) {
      setDragOverStatus(colStatus);
    }
  };

  const handleColumnDragLeave = (e: DragEvent<HTMLDivElement>, colStatus: TicketStatus) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverStatus === colStatus) {
      setDragOverStatus(null);
    }
  };

  const handleColumnDrop = async (e: DragEvent<HTMLDivElement>, targetStatus: TicketStatus) => {
    e.preventDefault();
    const ticketId = draggedTicketId || e.dataTransfer.getData('text/plain');
    setDraggedTicketId(null);
    setDragOverStatus(null);

    if (!ticketId) return;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || !canMoveTicket(ticket) || ticket.status === targetStatus) return;

    setUpdatingId(ticketId);
    try {
      await onStatusChange(ticketId, targetStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex overflow-x-auto pb-3 snap-x snap-mandatory lg:grid lg:grid-cols-5 gap-4">
      {ALL_STATUSES.map((colStatus) => {
        const colTickets = tickets.filter((t) => t.status === colStatus);
        const isDropTarget =
          dragOverStatus === colStatus &&
          draggedTicket !== null &&
          draggedTicket.status !== colStatus;

        return (
          <div
            key={colStatus}
            onDragOver={(e) => handleColumnDragOver(e, colStatus)}
            onDragLeave={(e) => handleColumnDragLeave(e, colStatus)}
            onDrop={(e) => void handleColumnDrop(e, colStatus)}
            className={`min-w-[270px] sm:min-w-[290px] lg:min-w-0 snap-start rounded-lg border border-t-[3px] ${COLUMN_TOP_ACCENT[colStatus]} p-3 flex flex-col gap-3 min-h-[380px] transition-colors ${
              isDropTarget
                ? 'border-blue-400 bg-blue-50/70 ring-2 ring-blue-500/20 dark:border-blue-500/60 dark:bg-blue-500/10'
                : 'border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-[#16181D]'
            }`}
          >
            <div className="flex items-center justify-between px-1">
              <StatusBadge status={colStatus} />
              <span className="inline-flex items-center justify-center rounded-full bg-zinc-200/70 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-600 dark:text-zinc-300">
                {colTickets.length}
              </span>
            </div>

            <div className="space-y-2.5 flex-1">
              {isDropTarget && (
                <div className="rounded-lg border-2 border-dashed border-blue-400/70 dark:border-blue-500/50 bg-blue-50/50 dark:bg-blue-500/5 px-3 py-2.5 text-center text-[11px] font-medium text-blue-600 dark:text-blue-300">
                  Drop to move to {STATUS_LABELS[colStatus]}
                </div>
              )}

              {colTickets.length === 0 && !isDropTarget && (
                <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 px-3 py-6 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
                  No tickets
                </div>
              )}

              {colTickets.map((t) => {
                const draggable = canMoveTicket(t);
                const isDragging = draggedTicketId === t.id;
                const isUpdating = updatingId === t.id;

                return (
                  <div
                    key={t.id}
                    draggable={draggable}
                    onDragStart={(e) => handleDragStart(e, t)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] p-3.5 space-y-2.5 shadow-2xs transition-all ${
                      draggable
                        ? 'cursor-grab active:cursor-grabbing hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs'
                        : ''
                    } ${isDragging ? 'opacity-45 scale-[0.98] ring-2 ring-blue-500/40' : ''} ${
                      isUpdating ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {draggable && (
                          <GripVertical
                            className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                            aria-hidden="true"
                          />
                        )}
                        <Link
                          to={`/tickets/${t.id}`}
                          className="font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          {t.ticketNumber}
                        </Link>
                      </div>
                      <PriorityBadge priority={t.priority} />
                    </div>

                    <Link
                      to={`/tickets/${t.id}`}
                      className="block text-xs font-semibold text-zinc-900 dark:text-white hover:text-blue-500 line-clamp-2"
                    >
                      {t.title}
                    </Link>

                    {(t.module || t.jiraIssue) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {t.module && (
                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 truncate max-w-[140px]">
                            {t.module.name}
                          </span>
                        )}
                        {t.jiraIssue && (
                          <span className="font-mono text-[10px] rounded bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300 px-1.5 py-0.5">
                            {t.jiraIssue.jiraKey}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="truncate">
                        {t.assignee ? t.assignee.displayName : 'Unassigned'}
                      </span>
                      <span className="inline-flex items-center gap-2 shrink-0">
                        {onTrackTicket && (
                          <button
                            type="button"
                            onClick={() => onTrackTicket(t)}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                          >
                            <Route className="h-2.5 w-2.5" />
                            Track Ticket
                          </button>
                        )}
                        <span className="inline-flex items-center gap-0.5">
                          <MessageSquare className="h-3 w-3" />
                          {t._count.comments}
                        </span>
                        <span className="inline-flex items-center gap-0.5">
                          <Paperclip className="h-3 w-3" />
                          {t._count.attachments}
                        </span>
                      </span>
                    </div>

                    {draggable && (
                      <select
                        value={t.status}
                        aria-label={`Change status for ${t.ticketNumber}`}
                        onChange={(e) =>
                          void onStatusChange(t.id, e.target.value as TicketStatus)
                        }
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-[#111215] px-2 py-1 text-[11px] text-zinc-700 dark:text-zinc-300 focus:outline-none"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            Move to: {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
