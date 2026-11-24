export type TicketStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED';

export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface TicketUser {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  avatarUrl: string | null;
}

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  dueDate: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: TicketUser;
  assignee: TicketUser | null;
  module: { id: string; name: string; projectName?: string | null; icon: string } | null;
  submodule: { id: string; name: string } | null;
  jiraIssue: { id: string; jiraKey: string; issueUrl: string; statusName: string } | null;
  history?: TicketHistoryItem[];
  _count: { comments: number; attachments: number };
}

export interface TicketCommentItem {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author: TicketUser;
}

export interface TicketAttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: TicketUser;
}

export interface TicketHistoryItem {
  id: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  actor: TicketUser | null;
}

export interface TicketDetail extends TicketSummary {
  outlookEmailId: string | null;
  outlookConversationId: string | null;
  comments: TicketCommentItem[];
  attachments: TicketAttachmentItem[];
  history: TicketHistoryItem[];
}

export interface ModuleOption {
  id: string;
  name: string;
  slug: string;
  projectName: string | null;
  submodules: Array<{ id: string; name: string; slug: string }>;
}
