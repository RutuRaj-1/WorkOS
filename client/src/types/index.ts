import { Timestamp } from 'firebase/firestore';

// ── Base Document ─────────────────────────────────────────────────────────────
export interface BaseDocument {
  id: string;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

// ── User & Auth ───────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'manager' | 'member' | 'viewer';

export interface User extends BaseDocument {
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  orgId?: string;
  workspaceIds?: string[];
  isActive: boolean;
  lastSeen?: Timestamp | Date | string;
  bio?: string;
  jobTitle?: string;
  phone?: string;
}

export interface Organization extends BaseDocument {
  name: string;
  slug: string;
  logoURL?: string;
  ownerId: string;
  members: {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    joinedAt: Timestamp | Date | string;
  }[];
  plan?: 'free' | 'pro' | 'enterprise';
}

export interface Workspace extends BaseDocument {
  orgId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  emoji?: string;
  memberIds: string[];
  createdBy: string;
  isArchived?: boolean;
}

// ── Dynamic Custom Fields Engine ──────────────────────────────────────────────
export type CustomFieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'currency'
  | 'date'
  | 'checkbox'
  | 'dropdown'
  | 'multi_select'
  | 'status'
  | 'user'
  | 'tags'
  | 'file'
  | 'url'
  | 'email'
  | 'phone'
  | 'progress'
  | 'formula';

export interface DropdownOption {
  id: string;
  label: string;
  color?: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: CustomFieldType;
  required?: boolean;
  description?: string;
  options?: DropdownOption[];
  currencySymbol?: string;
  formula?: string;
  order: number;
}

// ── Dynamic Module System ─────────────────────────────────────────────────────
export type ViewType = 'spreadsheet' | 'kanban' | 'table' | 'list' | 'calendar' | 'gallery';

export interface SavedView {
  id: string;
  name: string;
  type: ViewType;
  groupByFieldId?: string;
  filterRules?: Record<string, unknown>;
  sortRules?: { fieldId: string; direction: 'asc' | 'desc' }[];
  visibleFieldIds?: string[];
}

export interface Module extends BaseDocument {
  workspaceId: string;
  orgId: string;
  name: string;
  icon?: string;
  emoji?: string;
  description?: string;
  fields: CustomField[];
  views: SavedView[];
  order: number;
  createdBy: string;
}

export type MainTab = Module;
export type SubTab = Module;

// ── Competition Round ────────────────────────────────────────────────────────
export interface CompetitionRound {
  name: string;        // e.g. "R-1", "R-2", "R-3", "Final Event"
  deadline?: string;   // ISO date string
  requirement?: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'skipped';
}

// ── Teammate Admin Participation ─────────────────────────────────────────────
export interface InvitedMember {
  uid: string;
  name: string;
  email?: string;
  role?: string;        // 'Owner' | 'Admin'
  status: 'pending' | 'accepted' | 'declined';
  respondedAt?: string;
}

// ── Dynamic Entity Record System ──────────────────────────────────────────────
export interface Entity extends BaseDocument {
  moduleId: string;
  subTabId?: string;
  mainTabId?: string;
  workspaceId: string;
  orgId: string;
  // Core competition event fields (matches spreadsheet)
  eventNo?: number;
  name: string;
  description?: string;
  teamMembers?: string[];          // Names of participants
  invitedMembers?: InvitedMember[]; // Structured participation approval status
  link?: string;                   // URL to the competition
  status?: string;                 // Upcoming / Ongoing / Completed / Not Selected / Cancelled
  organizer?: string;              // Organized By
  mode?: 'Online' | 'Offline' | 'Hybrid';
  location?: string;               // Location & Venue
  // Rounds: R-1, R-2, R-3, Final Event each with deadline + requirement
  rounds?: CompetitionRound[];
  finalEventDate?: string;         // ISO date
  outcome?: string;                // The Overall Outcome
  // Legacy / scraped fields
  website?: string;
  prize?: string;
  venue?: string;
  eligibility?: string;
  timeline?: string;
  fieldValues: Record<string, unknown>;
  isScraped?: boolean;
  scrapedUrl?: string;
  isArchived?: boolean;
  createdBy: string;
  createdByName?: string;
}

export type Project = Entity;


// ── Task Management System ────────────────────────────────────────────────────
export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done' | 'cancelled';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface Task extends BaseDocument {
  entityId?: string;
  projectId?: string;
  workspaceId: string;
  orgId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags?: string[];
  dueDate?: Timestamp | Date | string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhoto?: string;
  createdBy: string;
}

// ── Automation Engine ─────────────────────────────────────────────────────────
export type TriggerType =
  | 'entity_created'
  | 'field_updated'
  | 'task_completed'
  | 'expense_added'
  | 'competition_scraped';

export type ActionType =
  | 'send_email'
  | 'create_notification'
  | 'generate_tasks'
  | 'update_field'
  | 'recalculate_roi';

export interface AutomationRule extends BaseDocument {
  workspaceId: string;
  orgId: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: TriggerType;
    moduleId?: string;
    fieldId?: string;
  };
  action: {
    type: ActionType;
    payload: Record<string, unknown>;
  };
  createdBy: string;
}

// ── Knowledge & Finance Collections ───────────────────────────────────────────
export type ExpenseCategory = string;

export interface Expense extends BaseDocument {
  entityId?: string;
  projectId?: string;
  workspaceId: string;
  orgId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: Timestamp | Date | string;
  createdBy: string;
}

export interface TeamContribution extends BaseDocument {
  orgId: string;
  teamName: string;
  memberNames: string[];
  associatedTransactionIds?: string[];
  createdBy: string;
}

export interface Income extends BaseDocument {
  entityId?: string;
  projectId?: string;
  workspaceId: string;
  orgId: string;
  type: string;
  amount: number;
  description: string;
  date: Timestamp | Date | string;
  createdBy: string;
}

export interface Goal extends BaseDocument {
  workspaceId: string;
  moduleId?: string;
  entityId?: string;
  orgId: string;
  title: string;
  type: string;
  period: 'yearly' | 'monthly' | 'quarterly' | 'weekly';
  target: number;
  current: number;
  unit?: string;
  createdBy: string;
}

export interface WorkDocument extends BaseDocument {
  entityId?: string;
  projectId?: string;
  workspaceId: string;
  orgId: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedByName?: string;
}

export interface Comment extends BaseDocument {
  entityType: 'entity' | 'project' | 'task' | 'document';
  entityId: string;
  userId: string;
  userName: string;
  content: string;
}

export interface ActivityLog extends BaseDocument {
  orgId: string;
  workspaceId?: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  entityName: string;
  metadata?: Record<string, unknown>;
}

export interface Notification extends BaseDocument {
  userId: string;
  title: string;
  body: string;
  type: string;        // e.g. 'competition_invite', 'invite_accepted', 'invite_declined', 'status_changed'
  read: boolean;
  link?: string;
  eventId?: string;
  eventName?: string;
  workspaceId?: string;
  senderId?: string;
  senderName?: string;
  actionRequired?: boolean;
  invitedStatus?: 'pending' | 'accepted' | 'declined';
}
