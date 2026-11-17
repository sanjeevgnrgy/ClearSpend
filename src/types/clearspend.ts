export type ExpenseCategory =
  | 'Dining'
  | 'Software'
  | 'Travel'
  | 'Groceries'
  | 'Utilities'
  | 'Housing';

export type SplitMethod =
  | 'equal'
  | 'exact'
  | 'percentage'
  | 'shares'
  | 'itemized';

export type AppPage =
  | 'overview'
  | 'splits'
  | 'automations'
  | 'analytics'
  | 'receipts';

export type TransactionSource =
  | 'Manual'
  | 'Receipt OCR'
  | 'Agentic Rule'
  | 'Bank Feed'
  | 'Group Split'
  | 'CSV Import'
  | 'Voice';

export interface GroupMember {
  id: string;
  name: string;
  initials: string;
  email: string;
  defaultWeight: number;
  isSelf?: boolean;
}

export interface SplitAllocation {
  memberId: string;
  amount: number;
}

export interface SharedExpense {
  id: string;
  groupId: string;
  title: string;
  category: ExpenseCategory;
  totalAmount: number;
  paidByMemberId: string;
  splitMethod: SplitMethod;
  allocations: SplitAllocation[];
  date: string;
  isSettlement?: boolean;
}

export interface RecurringGroupBill {
  id: string;
  groupId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  dayOfMonth: number;
  active: boolean;
}

export interface SplitGroup {
  id: string;
  name: string;
  description: string;
  currency: string;
  fairnessLabel: string;
  memberIds: string[];
  shareId?: string;
}

export interface LedgerTransaction {
  id: string;
  merchant: string;
  category: ExpenseCategory;
  date: string;
  amount: number;
  note: string;
  source: TransactionSource;
  groupId?: string;
}

export interface AgentSuggestion {
  id: string;
  type: 'duplicate' | 'price_hike' | 'auto_split' | 'settlement' | 'collision';
  title: string;
  description: string;
  impactLabel: string;
  actionLabel: string;
  status: 'pending' | 'applied' | 'dismissed';
  draftEmailSubject?: string;
  draftEmailBody?: string;
  payload?: {
    merchant?: string;
    category?: ExpenseCategory;
    groupId?: string;
    amount?: number;
  };
}

export interface AutomationRule {
  id: string;
  name: string;
  conditionText: string;
  actionText: string;
  matchesThisMonth: number;
  enabled: boolean;
}

export interface ReceiptLineItem {
  name: string;
  price: number;
}

export interface ReceiptDocument {
  id: string;
  merchant: string;
  date: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  category: ExpenseCategory;
  paymentMethod: string;
  items: ReceiptLineItem[];
  assignedTarget: 'unassigned' | 'personal' | string;
}

export interface SubscriptionItem {
  id: string;
  vendor: string;
  cadence: 'Monthly' | 'Annual';
  nextBillDate: string;
  monthlyCost: number;
  previousCost?: number;
  status: 'Active' | 'Price Increased' | 'Paused';
}

export interface PublicShareSnapshot {
  ownerId: string;
  groupId: string;
  groupName: string;
  description: string;
  currency: string;
  totalGroupSpend: number;
  transfers: { from: string; to: string; amount: number }[];
  expenses: { title: string; paidBy: string; amount: number; date: string }[];
}
