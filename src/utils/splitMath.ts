import {
  ExpenseCategory,
  GroupMember,
  SharedExpense,
  SplitAllocation,
  SplitGroup,
} from '../types/clearspend';

export interface MemberBalance {
  memberId: string;
  netBalance: number; // positive = owed to member, negative = member owes
}

export interface SimplifiedTransfer {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

/**
 * Computes net balance for every member in a group.
 * Positive balance means others owe this member; negative means this member owes the group.
 */
export function calculateGroupBalances(
  memberIds: string[],
  expenses: SharedExpense[]
): MemberBalance[] {
  const balances: Record<string, number> = {};
  for (const id of memberIds) {
    balances[id] = 0;
  }

  for (const exp of expenses) {
    if (balances[exp.paidByMemberId] === undefined) {
      balances[exp.paidByMemberId] = 0;
    }
    balances[exp.paidByMemberId] += exp.totalAmount;

    for (const alloc of exp.allocations) {
      if (balances[alloc.memberId] === undefined) {
        balances[alloc.memberId] = 0;
      }
      balances[alloc.memberId] -= alloc.amount;
    }
  }

  return memberIds.map((memberId) => ({
    memberId,
    netBalance: Math.round((balances[memberId] ?? 0) * 100) / 100,
  }));
}

/**
 * Greedy minimum-cash-flow debt simplification algorithm.
 * Reduces N-to-N debts into minimal pairwise transfers.
 */
export function simplifyGroupDebts(
  memberBalances: MemberBalance[]
): SimplifiedTransfer[] {
  const debtors = memberBalances
    .filter((b) => b.netBalance < -0.009)
    .map((b) => ({ memberId: b.memberId, amount: Math.abs(b.netBalance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = memberBalances
    .filter((b) => b.netBalance > 0.009)
    .map((b) => ({ memberId: b.memberId, amount: b.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SimplifiedTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settled = Math.min(debtor.amount, creditor.amount);

    if (settled > 0.009) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount: Math.round(settled * 100) / 100,
      });
    }

    debtor.amount = Math.round((debtor.amount - settled) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - settled) * 100) / 100;

    if (debtor.amount <= 0.009) i++;
    if (creditor.amount <= 0.009) j++;
  }

  return transfers;
}

/**
 * Distributes a total amount cleanly down to the cent with remainder handled on the first member.
 */
export function buildEqualAllocations(
  memberIds: string[],
  totalAmount: number
): SplitAllocation[] {
  if (memberIds.length === 0) return [];
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents - baseCents * memberIds.length;

  return memberIds.map((memberId, index) => ({
    memberId,
    amount: (baseCents + (index < remainder ? 1 : 0)) / 100,
  }));
}

export interface ParsedAgentIntent {
  kind: 'personal_expense' | 'shared_split';
  merchant: string;
  amount: number;
  category: ExpenseCategory;
  groupId?: string;
  groupName?: string;
  participantIds?: string[];
  participantNames?: string[];
  summary: string;
}

const CATEGORY_KEYWORDS: { category: ExpenseCategory; words: string[] }[] = [
  {
    category: 'Dining',
    words: ['dinner', 'lunch', 'breakfast', 'coffee', 'cafe', 'bar', 'drink', 'osteria', 'tartine', 'pizza', 'sushi', 'restaurant', 'bistro'],
  },
  {
    category: 'Travel',
    words: ['uber', 'lyft', 'flight', 'airline', 'hotel', 'airbnb', 'train', 'amtrak', 'metro', 'taxi', 'airport', 'fuel', 'gas', 'toll'],
  },
  {
    category: 'Groceries',
    words: ['grocery', 'groceries', 'whole foods', 'trader joe', 'market', 'supermarket', 'produce'],
  },
  {
    category: 'Utilities',
    words: ['electric', 'water', 'internet', 'wifi', 'utility', 'utilities', 'coned', 'heating', 'fiber'],
  },
  {
    category: 'Housing',
    words: ['rent', 'lease', 'apartment', 'maintenance', 'cleaning'],
  },
  {
    category: 'Software',
    words: ['figma', 'aws', 'notion', 'linear', 'vercel', 'cloud', 'subscription', 'saas', 'hosting', 'github'],
  },
];

/**
 * Deterministic smart natural-language parser for the Agentic Command Bar.
 */
export function parseAgenticCommand(
  rawInput: string,
  members: GroupMember[],
  groups: SplitGroup[]
): ParsedAgentIntent | null {
  const input = rawInput.trim();
  if (!input) return null;

  const lower = input.toLowerCase();

  // Extract dollar amount
  const amountMatch = input.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (!amountMatch) return null;
  const amount = Number.parseFloat(amountMatch[1].replace(/,/g, ''));
  if (Number.isNaN(amount) || amount <= 0 || amount > 100000) return null;

  // Detect category
  let detectedCategory: ExpenseCategory = 'Dining';
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.words.some((w) => lower.includes(w))) {
      detectedCategory = entry.category;
      break;
    }
  }

  // Detect explicit group mention
  const matchedGroup = groups.find((g) =>
    lower.includes(g.name.toLowerCase())
  );

  // Detect mentioned members (excluding self unless explicitly matched)
  const selfMember = members.find((m) => m.isSelf) ?? members[0];
  const matchedMembers = members.filter((m) => {
    const first = m.name.split(' ')[0].toLowerCase();
    return !m.isSelf && lower.includes(first);
  });

  const isSplitIntent =
    lower.includes('split') ||
    lower.includes('share') ||
    Boolean(matchedGroup) ||
    matchedMembers.length > 0;

  // Clean merchant/title extraction
  let merchant = input
    .replace(/\$?\s*\d+(?:,\d{3})*(?:\.\d{1,2})?/, '')
    .replace(/\b(split|log|add|record|paid|for|with|and|under|equally|in|on|at|the|to)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove mentioned member names and group names from merchant title
  for (const m of matchedMembers) {
    const first = m.name.split(' ')[0];
    merchant = merchant.replace(new RegExp(`\\b${first}\\b`, 'gi'), '').trim();
  }
  if (matchedGroup) {
    merchant = merchant
      .replace(new RegExp(matchedGroup.name, 'gi'), '')
      .trim();
  }
  merchant = merchant.replace(/^[,.\-–]+|[,.\-–]+$/g, '').trim();
  if (!merchant || merchant.length < 2) {
    merchant = `${detectedCategory} Expense`;
  } else {
    merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);
  }

  if (isSplitIntent) {
    const targetGroup = matchedGroup ?? groups[0];
    const participantIds =
      matchedMembers.length > 0
        ? [selfMember.id, ...matchedMembers.map((m) => m.id)]
        : targetGroup.memberIds;

    const participantNames = participantIds
      .map((id) => members.find((m) => m.id === id)?.name.split(' ')[0] ?? id);

    const perPerson = amount / participantIds.length;
    return {
      kind: 'shared_split',
      merchant,
      amount,
      category: detectedCategory,
      groupId: targetGroup.id,
      groupName: targetGroup.name,
      participantIds,
      participantNames,
      summary: `Split $${amount.toFixed(2)} across ${participantIds.length} people ($${perPerson.toFixed(2)} each) in ${targetGroup.name}`,
    };
  }

  return {
    kind: 'personal_expense',
    merchant,
    amount,
    category: detectedCategory,
    summary: `Log $${amount.toFixed(2)} for "${merchant}" under ${detectedCategory}`,
  };
}
