export type ExpenseCategory =
  | 'Dining'
  | 'Software'
  | 'Travel'
  | 'Groceries'
  | 'Utilities'
  | 'Housing';

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

export type AppPage =
  | 'overview'
  | 'splits'
  | 'automations'
  | 'analytics'
  | 'receipts';

export interface GroupMember {
  id: string;
  name: string;
  initials: string;
  email: string;
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

export interface SplitGroup {
  id: string;
  name: string;
  description: string;
  currency: string;
  memberIds: string[];
}

export interface LedgerTransaction {
  id: string;
  merchant: string;
  category: ExpenseCategory;
  date: string;
  amount: number;
  note: string;
  source: 'Manual' | 'Receipt OCR' | 'Agentic Rule' | 'Bank Feed' | 'Group Split';
  groupId?: string;
}

export interface AgentSuggestion {
  id: string;
  type: 'duplicate' | 'price_hike' | 'auto_split' | 'settlement';
  title: string;
  description: string;
  impactLabel: string;
  actionLabel: string;
  status: 'pending' | 'applied' | 'dismissed';
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
  items: { name: string; price: number }[];
  assignedTarget: 'unassigned' | 'personal' | string; // groupId if assigned to group
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
