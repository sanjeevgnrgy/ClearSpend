export type ExpenseCategory = 'Dining' | 'Software' | 'Travel' | 'Groceries';

export interface LedgerEntry {
  id: string;
  merchant: string;
  category: ExpenseCategory;
  date: string;
  amount: number;
  note: string;
}

export interface ReceiptSample {
  id: string;
  merchant: string;
  total: number;
  tax: number;
  category: ExpenseCategory;
  paymentMethod: string;
  items: { name: string; price: number }[];
}

export const INITIAL_HERO_PERSONAL: LedgerEntry[] = [
  {
    id: 'hp-1',
    merchant: 'Trader Joe’s Market',
    category: 'Groceries',
    date: 'Today · 09:42',
    amount: 68.40,
    note: 'Weekly groceries',
  },
  {
    id: 'hp-2',
    merchant: 'Blue Bottle Coffee',
    category: 'Dining',
    date: 'Today · 08:15',
    amount: 7.50,
    note: 'Morning pour-over',
  },
  {
    id: 'hp-3',
    merchant: 'Linear Workspace',
    category: 'Software',
    date: 'Nov 15 · Auto',
    amount: 16.00,
    note: 'Monthly renewal',
  },
  {
    id: 'hp-4',
    merchant: 'Metro Transit Pass',
    category: 'Travel',
    date: 'Nov 14 · Tap',
    amount: 34.00,
    note: 'Commuter reload',
  },
];

export const INITIAL_HERO_TEAM: LedgerEntry[] = [
  {
    id: 'ht-1',
    merchant: 'AWS Production Cluster',
    category: 'Software',
    date: 'Today · 10:04',
    amount: 412.80,
    note: 'Compute & storage',
  },
  {
    id: 'ht-2',
    merchant: 'Delta Air Lines',
    category: 'Travel',
    date: 'Yesterday · 16:30',
    amount: 584.00,
    note: 'Chicago client visit',
  },
  {
    id: 'ht-3',
    merchant: 'Tartine Manufactory',
    category: 'Dining',
    date: 'Nov 14 · 12:45',
    amount: 146.20,
    note: 'Design team lunch',
  },
  {
    id: 'ht-4',
    merchant: 'Figma Organization',
    category: 'Software',
    date: 'Nov 12 · Auto',
    amount: 180.00,
    note: '4 editor seats',
  },
];

export const RECEIPT_SAMPLES: ReceiptSample[] = [
  {
    id: 'rcpt-1',
    merchant: 'Daily Grind Roasters',
    total: 14.20,
    tax: 1.18,
    category: 'Dining',
    paymentMethod: 'Apple Pay · 4821',
    items: [
      { name: 'Cortado Oat Milk', price: 5.50 },
      { name: 'Cardamom Bun', price: 7.52 },
    ],
  },
  {
    id: 'rcpt-2',
    merchant: 'Nordic Air Express',
    total: 348.00,
    tax: 26.40,
    category: 'Travel',
    paymentMethod: 'Corporate Visa · 9014',
    items: [
      { name: 'Roundtrip Economy Fare', price: 294.60 },
      { name: 'Carry-On Allocation', price: 27.00 },
    ],
  },
  {
    id: 'rcpt-3',
    merchant: 'Figma Team Plan',
    total: 45.00,
    tax: 0.00,
    category: 'Software',
    paymentMethod: 'Virtual Card · 1102',
    items: [
      { name: 'Pro Seat × 3', price: 45.00 },
    ],
  },
];

export const SANDBOX_INITIAL_EXPENSES: LedgerEntry[] = [
  {
    id: 'sb-1',
    merchant: 'Whole Foods Market',
    category: 'Groceries',
    date: 'Nov 16',
    amount: 112.65,
    note: 'Household staples',
  },
  {
    id: 'sb-2',
    merchant: 'Vercel Pro Hosting',
    category: 'Software',
    date: 'Nov 15',
    amount: 40.00,
    note: 'Production bandwidth',
  },
  {
    id: 'sb-3',
    merchant: 'Amtrak Acela',
    category: 'Travel',
    date: 'Nov 14',
    amount: 138.00,
    note: 'NYC to Boston',
  },
  {
    id: 'sb-4',
    merchant: 'Osteria Mozza',
    category: 'Dining',
    date: 'Nov 12',
    amount: 94.50,
    note: 'Partner dinner',
  },
  {
    id: 'sb-5',
    merchant: '1Password Families',
    category: 'Software',
    date: 'Nov 10',
    amount: 19.95,
    note: 'Annualized monthly',
  },
];

export const MONTHLY_CHART_SERIES = {
  Spending: [
    { month: 'Jun', value: 2840 },
    { month: 'Jul', value: 3120 },
    { month: 'Aug', value: 2690 },
    { month: 'Sep', value: 2980 },
    { month: 'Oct', value: 2540 },
    { month: 'Nov', value: 2210 },
  ],
  Savings: [
    { month: 'Jun', value: 1160 },
    { month: 'Jul', value: 880 },
    { month: 'Aug', value: 1310 },
    { month: 'Sep', value: 1020 },
    { month: 'Oct', value: 1460 },
    { month: 'Nov', value: 1790 },
  ],
  Recurring: [
    { month: 'Jun', value: 640 },
    { month: 'Jul', value: 640 },
    { month: 'Aug', value: 615 },
    { month: 'Sep', value: 590 },
    { month: 'Oct', value: 520 },
    { month: 'Nov', value: 485 },
  ],
} as const;
