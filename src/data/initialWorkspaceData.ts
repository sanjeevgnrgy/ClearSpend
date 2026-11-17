import {
  AgentSuggestion,
  AutomationRule,
  GroupMember,
  LedgerTransaction,
  ReceiptDocument,
  RecurringGroupBill,
  SharedExpense,
  SplitGroup,
  SubscriptionItem,
} from '../types/clearspend';

export const GROUP_MEMBERS: GroupMember[] = [
  { id: 'm-you', name: 'You (Alex)', initials: 'AL', email: 'alex@clearspend.app', defaultWeight: 50, isSelf: true },
  { id: 'm-maya', name: 'Maya Lin', initials: 'ML', email: 'maya@studio.co', defaultWeight: 50 },
  { id: 'm-liam', name: 'Liam Chen', initials: 'LC', email: 'liam@northstar.io', defaultWeight: 50 },
  { id: 'm-samira', name: 'Samira Patel', initials: 'SP', email: 'samira@oakridge.com', defaultWeight: 50 },
];

export const INITIAL_SPLIT_GROUPS: SplitGroup[] = [
  {
    id: 'grp-lisbon',
    name: 'Lisbon Trip',
    description: 'Flights, stays, and shared dinners · Nov 8–14',
    currency: 'USD',
    fairnessLabel: 'Equal (25% each)',
    memberIds: ['m-you', 'm-maya', 'm-liam', 'm-samira'],
    shareId: 'lisbon-nov-2026',
  },
  {
    id: 'grp-apt',
    name: 'Apartment 4B',
    description: 'Monthly rent, utilities, and household staples',
    currency: 'USD',
    fairnessLabel: '60/40 Fairness Preset',
    memberIds: ['m-you', 'm-maya'],
    shareId: 'apartment-4b-nov',
  },
  {
    id: 'grp-offsite',
    name: 'Design Offsite',
    description: 'Team travel, coworking passes, and client meals',
    currency: 'USD',
    fairnessLabel: 'Equal (33% each)',
    memberIds: ['m-you', 'm-liam', 'm-samira'],
    shareId: 'design-offsite-q4',
  },
];

export const INITIAL_RECURRING_BILLS: RecurringGroupBill[] = [
  {
    id: 'rb-1',
    groupId: 'grp-apt',
    title: 'Apartment 4B Monthly Rent',
    category: 'Housing',
    amount: 2400.0,
    dayOfMonth: 1,
    active: true,
  },
  {
    id: 'rb-2',
    groupId: 'grp-apt',
    title: 'Sonic Fiber Gigabit Internet',
    category: 'Utilities',
    amount: 70.0,
    dayOfMonth: 15,
    active: true,
  },
];

export const INITIAL_SHARED_EXPENSES: SharedExpense[] = [
  {
    id: 'se-1',
    groupId: 'grp-lisbon',
    title: 'Alfama Boutique Stay (4 nights)',
    category: 'Housing',
    totalAmount: 640.0,
    paidByMemberId: 'm-you',
    splitMethod: 'equal',
    allocations: [
      { memberId: 'm-you', amount: 160.0 },
      { memberId: 'm-maya', amount: 160.0 },
      { memberId: 'm-liam', amount: 160.0 },
      { memberId: 'm-samira', amount: 160.0 },
    ],
    date: 'Nov 10',
  },
  {
    id: 'se-2',
    groupId: 'grp-lisbon',
    title: 'Taberna da Rua Dinner',
    category: 'Dining',
    totalAmount: 184.0,
    paidByMemberId: 'm-maya',
    splitMethod: 'equal',
    allocations: [
      { memberId: 'm-you', amount: 46.0 },
      { memberId: 'm-maya', amount: 46.0 },
      { memberId: 'm-liam', amount: 46.0 },
      { memberId: 'm-samira', amount: 46.0 },
    ],
    date: 'Nov 12',
  },
  {
    id: 'se-3',
    groupId: 'grp-lisbon',
    title: 'Airport Van & Tolls',
    category: 'Travel',
    totalAmount: 92.0,
    paidByMemberId: 'm-liam',
    splitMethod: 'equal',
    allocations: [
      { memberId: 'm-you', amount: 23.0 },
      { memberId: 'm-maya', amount: 23.0 },
      { memberId: 'm-liam', amount: 23.0 },
      { memberId: 'm-samira', amount: 23.0 },
    ],
    date: 'Nov 14',
  },
  {
    id: 'se-4',
    groupId: 'grp-apt',
    title: 'ConEd Electric & Gas (60/40 preset)',
    category: 'Utilities',
    totalAmount: 150.0,
    paidByMemberId: 'm-you',
    splitMethod: 'percentage',
    allocations: [
      { memberId: 'm-you', amount: 90.0 },
      { memberId: 'm-maya', amount: 60.0 },
    ],
    date: 'Nov 09',
  },
  {
    id: 'se-5',
    groupId: 'grp-apt',
    title: 'Trader Joe’s Household Run',
    category: 'Groceries',
    totalAmount: 96.2,
    paidByMemberId: 'm-maya',
    splitMethod: 'equal',
    allocations: [
      { memberId: 'm-you', amount: 48.1 },
      { memberId: 'm-maya', amount: 48.1 },
    ],
    date: 'Nov 15',
  },
  {
    id: 'se-6',
    groupId: 'grp-offsite',
    title: 'Second Home Coworking Passes',
    category: 'Software',
    totalAmount: 210.0,
    paidByMemberId: 'm-samira',
    splitMethod: 'equal',
    allocations: [
      { memberId: 'm-you', amount: 70.0 },
      { memberId: 'm-liam', amount: 70.0 },
      { memberId: 'm-samira', amount: 70.0 },
    ],
    date: 'Nov 11',
  },
];

export const INITIAL_LEDGER_TRANSACTIONS: LedgerTransaction[] = [
  {
    id: 'tx-1',
    merchant: 'Trader Joe’s Market',
    category: 'Groceries',
    date: 'Nov 16',
    amount: 68.4,
    note: 'Weekly produce & coffee',
    source: 'Receipt OCR',
  },
  {
    id: 'tx-2',
    merchant: 'Figma Organization',
    category: 'Software',
    date: 'Nov 15',
    amount: 45.0,
    note: '3 editor seats',
    source: 'Bank Feed',
  },
  {
    id: 'tx-3',
    merchant: 'Amtrak Acela',
    category: 'Travel',
    date: 'Nov 14',
    amount: 138.0,
    note: 'NYC to Boston client trip',
    source: 'Agentic Rule',
  },
  {
    id: 'tx-4',
    merchant: 'Blue Bottle Coffee',
    category: 'Dining',
    date: 'Nov 14',
    amount: 7.5,
    note: 'Morning pour-over',
    source: 'Receipt OCR',
  },
  {
    id: 'tx-5',
    merchant: 'ConEd Electric & Gas (Your 60% share)',
    category: 'Utilities',
    date: 'Nov 09',
    amount: 90.0,
    note: 'Split in Apartment 4B',
    source: 'Group Split',
    groupId: 'grp-apt',
  },
  {
    id: 'tx-6',
    merchant: 'Vercel Pro Hosting',
    category: 'Software',
    date: 'Nov 08',
    amount: 40.0,
    note: 'Monthly infrastructure',
    source: 'Bank Feed',
  },
  {
    id: 'tx-7',
    merchant: 'Whole Foods Market',
    category: 'Groceries',
    date: 'Nov 06',
    amount: 112.65,
    note: 'Pantry restock',
    source: 'Receipt OCR',
  },
  {
    id: 'tx-8',
    merchant: 'Osteria Mozza',
    category: 'Dining',
    date: 'Nov 04',
    amount: 94.5,
    note: 'Partner dinner',
    source: 'Manual',
  },
];

export const INITIAL_AGENT_SUGGESTIONS: AgentSuggestion[] = [
  {
    id: 'ag-1',
    type: 'duplicate',
    title: 'Duplicate SaaS charge detected on Figma Organization',
    description:
      'Figma Organization ($45.00) billed twice within 36 hours on Virtual Card · 1102. Ready to draft a refund request.',
    impactLabel: 'Recover $45.00',
    actionLabel: 'Draft Refund Email',
    status: 'pending',
    draftEmailSubject: 'Refund request for duplicate charge ($45.00) on Nov 15',
    draftEmailBody:
      'Hello Figma Billing Support,\n\nI noticed two identical $45.00 charges for Figma Organization on Virtual Card ending in 1102 (Nov 14 and Nov 15). Could you please reverse the duplicate authorization and confirm via email?\n\nThank you,\nAlex Rivera',
    payload: { merchant: 'Figma Organization', amount: 45 },
  },
  {
    id: 'ag-2',
    type: 'auto_split',
    title: 'Auto-split pattern found for Trader Joe’s',
    description:
      'You split 4 of your last 5 Trader Joe’s receipts with Maya Lin in Apartment 4B. Create an automatic split rule?',
    impactLabel: 'Saves ~4 min/week',
    actionLabel: 'Create Split Rule',
    status: 'pending',
    payload: { merchant: 'Trader Joe’s', category: 'Groceries', groupId: 'grp-apt' },
  },
  {
    id: 'ag-3',
    type: 'price_hike',
    title: 'Notion Workspace renewal increased by 50%',
    description:
      'Notion Workspace moved from $10.00/mo to $15.00/mo ahead of your Nov 24 renewal. Ready to cancel or downgrade.',
    impactLabel: 'Save $180.00/yr',
    actionLabel: 'Draft Cancellation',
    status: 'pending',
    draftEmailSubject: 'Request to downgrade / cancel Notion Workspace before Nov 24 renewal',
    draftEmailBody:
      'Hello Notion Support,\n\nAhead of our upcoming Nov 24 billing cycle, we saw the monthly plan increase from $10.00 to $15.00. Please cancel auto-renewal on our workspace or revert to the Personal Free tier before the charge posts.\n\nBest regards,\nAlex Rivera',
  },
  {
    id: 'ag-4',
    type: 'settlement',
    title: 'Lisbon Trip settles in 3 transfers instead of 6',
    description:
      'Debt simplification is ready for Lisbon Trip. Liam, Maya, and Samira owe a combined net $411.00 to you — covering upcoming rent.',
    impactLabel: '3 fewer transfers',
    actionLabel: 'Open Splits',
    status: 'pending',
    payload: { groupId: 'grp-lisbon' },
  },
];

export const INITIAL_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Auto-tag rideshares as Travel',
    conditionText: 'Merchant matches Uber, Lyft, or Bolt',
    actionText: 'Assign category Travel',
    matchesThisMonth: 14,
    enabled: true,
  },
  {
    id: 'rule-2',
    name: 'Split ConEd utility bills 60/40',
    conditionText: 'Merchant contains ConEd or Sonic Fiber',
    actionText: 'Split via Apartment 4B Fairness Preset',
    matchesThisMonth: 2,
    enabled: true,
  },
  {
    id: 'rule-3',
    name: 'Alert on renewals above $50',
    conditionText: 'Recurring SaaS charge > $50.00',
    actionText: 'Send 48h advance inbox prompt',
    matchesThisMonth: 3,
    enabled: true,
  },
  {
    id: 'rule-4',
    name: 'Normalize foreign card charges',
    conditionText: 'Currency is not USD',
    actionText: 'Lock ECB mid-market spot rate',
    matchesThisMonth: 9,
    enabled: false,
  },
];

export const INITIAL_RECEIPTS: ReceiptDocument[] = [
  {
    id: 'rcpt-101',
    merchant: 'Osteria Mozza Group Dinner',
    date: 'Nov 16 · 20:18',
    subtotal: 142.0,
    tax: 12.78,
    tip: 25.22,
    total: 180.0,
    category: 'Dining',
    paymentMethod: 'Apple Pay · 4821',
    items: [
      { name: 'Burrata & Charred Bread', price: 24.0 },
      { name: 'Wild King Salmon (Maya)', price: 42.0 },
      { name: 'Tagliatelle Bolognese (Alex)', price: 32.0 },
      { name: 'Barolo Bottle (Liam & Alex)', price: 44.0 },
    ],
    assignedTarget: 'unassigned',
  },
  {
    id: 'rcpt-102',
    merchant: 'Mercadona Lisbon',
    date: 'Nov 13 · 17:15',
    subtotal: 62.4,
    tax: 4.8,
    tip: 0.0,
    total: 67.2,
    category: 'Groceries',
    paymentMethod: 'Sapphire Visa · 9014',
    items: [
      { name: 'Breakfast Provisions', price: 38.4 },
      { name: 'Sparkling Water & Coffee', price: 24.0 },
    ],
    assignedTarget: 'grp-lisbon',
  },
  {
    id: 'rcpt-103',
    merchant: 'AWS Cloud Services',
    date: 'Nov 11 · 00:05',
    subtotal: 118.5,
    tax: 0.0,
    tip: 0.0,
    total: 118.5,
    category: 'Software',
    paymentMethod: 'Virtual Card · 1102',
    items: [
      { name: 'EC2 & RDS Instances', price: 94.2 },
      { name: 'S3 Storage & CloudFront', price: 24.3 },
    ],
    assignedTarget: 'personal',
  },
];

export const INITIAL_SUBSCRIPTIONS: SubscriptionItem[] = [
  {
    id: 'sub-1',
    vendor: 'Figma Organization',
    cadence: 'Monthly',
    nextBillDate: 'Dec 15',
    monthlyCost: 45.0,
    status: 'Active',
  },
  {
    id: 'sub-2',
    vendor: 'Vercel Pro',
    cadence: 'Monthly',
    nextBillDate: 'Dec 08',
    monthlyCost: 40.0,
    status: 'Active',
  },
  {
    id: 'sub-3',
    vendor: 'Notion Workspace',
    cadence: 'Monthly',
    nextBillDate: 'Nov 24',
    monthlyCost: 15.0,
    previousCost: 10.0,
    status: 'Price Increased',
  },
  {
    id: 'sub-4',
    vendor: 'Linear Plus',
    cadence: 'Monthly',
    nextBillDate: 'Dec 01',
    monthlyCost: 16.0,
    status: 'Active',
  },
  {
    id: 'sub-5',
    vendor: '1Password Families',
    cadence: 'Annual',
    nextBillDate: 'Apr 12',
    monthlyCost: 4.99,
    status: 'Active',
  },
];

export const SAMPLE_BANK_CSV = `Date,Merchant,Amount,Card
2026-11-16,TRADER JOE S #104 SAN FRANCISCO,54.20,Sapphire 9014
2026-11-15,CONED UTILITY AUTOPAY,142.00,Checking 4410
2026-11-14,UBER *TRIP HELP.UBER.COM,28.40,Sapphire 9014
2026-11-13,BLUE BOTTLE COFFEE CO,6.75,Apple Pay 4821
2026-11-12,FIGMA *PRO PLAN,45.00,Virtual 1102`;

export const CATEGORY_BUDGETS: { category: 'Groceries' | 'Dining' | 'Travel' | 'Software' | 'Utilities'; cap: number }[] = [
  { category: 'Groceries', cap: 450 },
  { category: 'Dining', cap: 320 },
  { category: 'Travel', cap: 400 },
  { category: 'Software', cap: 200 },
  { category: 'Utilities', cap: 180 },
];

export const ANALYTICS_MONTHLY_SERIES = {
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
  SharedSplits: [
    { month: 'Jun', value: 520 },
    { month: 'Jul', value: 780 },
    { month: 'Aug', value: 640 },
    { month: 'Sep', value: 490 },
    { month: 'Oct', value: 860 },
    { month: 'Nov', value: 1370 },
  ],
} as const;
