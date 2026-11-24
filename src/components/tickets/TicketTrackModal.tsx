import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDown,
  Check,
  CheckCircle2,
  CircleDot,
  Clock,
  ExternalLink,
  Route,
  UserCheck,
  UserCog,
  User as UserIcon,
  X,
  XCircle,
} from 'lucide-react';
import { PriorityBadge, STATUS_LABELS, StatusBadge } from './TicketBadges';
import type { TicketDetail, TicketStatus, TicketSummary } from '../../types/ticket';

interface TicketTrackModalProps {
  ticket: TicketSummary | TicketDetail | null;
  onClose: () => void;
  showFullTicketLink?: boolean;
}

const PIPELINE_STEPS: Array<{
  status: TicketStatus;
  label: string;
  description: string;
  Icon: typeof CircleDot;
}> = [
  {
    status: 'NOT_STARTED',
    label: 'Not Started',
    description: 'Ticket raised & queued',
    Icon: CircleDot,
  },
  {
    status: 'IN_PROGRESS',
    label: 'In Progress',
    description: 'Actively being worked on',
    Icon: Activity,
  },
  {
    status: 'PENDING',
    label: 'Pending',
    description: 'Awaiting review / info',
    Icon: Clock,
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
    description: 'Resolved & closed',
    Icon: CheckCircle2,
  },
];

export function TicketTrackModal({
  ticket,
  onClose,
  showFullTicketLink = true,
}: TicketTrackModalProps) {
  if (!ticket) return null;

  const isCancelled = ticket.status === 'CANCELLED';
  const activeIndex = PIPELINE_STEPS.findIndex((s) => s.status === ticket.status);
  const latestHistory = ticket.history && ticket.history.length > 0 ? ticket.history[0] : null;
  const updatedByName =
    latestHistory?.actor?.displayName ??
    ticket.assignee?.displayName ??
    ticket.reporter.displayName;
  const updatedActionLabel = latestHistory
    ? latestHistory.action.toLowerCase().replace(/_/g, ' ')
    : 'created';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-5 py-3.5">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                <Route className="h-3 w-3" />
                Track Ticket
              </span>
              <span className="font-mono text-[11px] font-semibold rounded bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 px-1.5 py-0.5">
                {ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
              {ticket.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close track ticket modal"
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Compact Vertical Down-Flowchart (Assignee -> Status -> Updated By) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 dark:border-zinc-800 dark:bg-[#111215] px-4 py-3.5">
            <div className="flex flex-col items-center">
              {/* Assignee Step */}
              <div
                className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                  ticket.assignee
                    ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                    : 'border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      ticket.assignee
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold leading-tight truncate ${
                        ticket.assignee
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {ticket.assignee
                        ? `Assigned to ${ticket.assignee.displayName}`
                        : 'Unassigned'}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                      Raised by {ticket.reporter.displayName}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-semibold ${
                    ticket.assignee
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {ticket.assignee ? 'Assigned' : 'Pending'}
                </span>
              </div>

              <div className="flex flex-col items-center py-0.5">
                <ArrowDown
                  className={`h-3.5 w-3.5 ${
                    ticket.assignee ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-700'
                  }`}
                />
              </div>

              {/* Status Pipeline */}
              {PIPELINE_STEPS.map((step, idx) => {
                const isDone = !isCancelled && (idx < activeIndex || ticket.status === 'COMPLETED');
                const isCurrent = !isCancelled && idx === activeIndex && ticket.status !== 'COMPLETED';
                const Icon = step.Icon;

                return (
                  <div key={step.status} className="w-full flex flex-col items-center">
                    <div
                      className={`w-full flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-all ${
                        isDone
                          ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                          : isCurrent
                            ? 'border-blue-400 bg-blue-50/90 ring-2 ring-blue-500/20 dark:border-blue-500/60 dark:bg-blue-500/15'
                            : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            isDone
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold leading-tight ${
                              isDone
                                ? 'text-emerald-800 dark:text-emerald-300'
                                : isCurrent
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-zinc-600 dark:text-zinc-300'
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {isCurrent && (
                        <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Current
                        </span>
                      )}
                      {isDone && (
                        <span className="shrink-0 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Done
                        </span>
                      )}
                    </div>

                    {(idx < PIPELINE_STEPS.length - 1 || isCancelled) && (
                      <div className="flex flex-col items-center py-0.5">
                        <ArrowDown
                          className={`h-3.5 w-3.5 ${
                            !isCancelled && idx < activeIndex
                              ? 'text-emerald-500'
                              : 'text-zinc-300 dark:text-zinc-700'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {isCancelled && (
                <div className="w-full flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/15 px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white">
                      <XCircle className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                        Cancelled
                      </p>
                      <p className="text-[10px] text-rose-600 dark:text-rose-300">
                        Ticket workflow stopped
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Current
                  </span>
                </div>
              )}

              {/* Updated By Step */}
              <div className="flex flex-col items-center py-0.5">
                <ArrowDown className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700" />
              </div>
              <div className="w-full flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#181A1F] px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-700">
                    <UserCog className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      Updated by {updatedByName}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate capitalize">
                      {updatedActionLabel} • {new Date(ticket.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Metadata Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#111215] p-2.5">
              <p className="text-[10px] font-medium text-zinc-400">Status</p>
              <p className="mt-0.5 text-[11px] font-semibold text-zinc-900 dark:text-white truncate">
                {STATUS_LABELS[ticket.status]}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#111215] p-2.5">
              <p className="text-[10px] font-medium text-zinc-400">Assignee</p>
              <p className="mt-0.5 text-[11px] font-semibold text-zinc-900 dark:text-white flex items-center gap-1 truncate">
                <UserIcon className="h-3 w-3 text-emerald-500 shrink-0" />
                <span className="truncate">
                  {ticket.assignee ? ticket.assignee.displayName : 'Unassigned'}
                </span>
              </p>
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#111215] p-2.5">
              <p className="text-[10px] font-medium text-zinc-400">Updated By</p>
              <p className="mt-0.5 text-[11px] font-semibold text-zinc-900 dark:text-white truncate">
                {updatedByName}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 px-5 py-3 bg-zinc-50/60 dark:bg-[#14161A]">
          {showFullTicketLink && (
            <Link
              to={`/tickets/${ticket.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Full Ticket
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-900 dark:bg-white px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
