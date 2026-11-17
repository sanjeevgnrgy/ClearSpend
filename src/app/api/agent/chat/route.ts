import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import type { Content, FunctionDeclaration } from '@google/genai';

const CLEARSPEND_TOOLS: FunctionDeclaration[] = [
  {
    name: 'navigate_page',
    description:
      'Navigate the user to a specific page in Clearspend.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: {
          type: Type.STRING,
          description:
            "One of: 'landing', 'overview', 'splits', 'automations', 'analytics', or 'receipts'.",
        },
      },
      required: ['page'],
    },
  },
  {
    name: 'add_personal_expense',
    description: 'Log a new personal expense into the ledger.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchant: { type: Type.STRING },
        amount: { type: Type.NUMBER },
        category: {
          type: Type.STRING,
          description:
            "One of: 'Dining', 'Software', 'Travel', 'Groceries', 'Utilities', 'Housing'.",
        },
        note: { type: Type.STRING },
      },
      required: ['merchant', 'amount', 'category'],
    },
  },
  {
    name: 'delete_personal_expense',
    description: 'Delete a personal expense by ID or merchant substring.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantOrId: { type: Type.STRING },
      },
      required: ['merchantOrId'],
    },
  },
  {
    name: 'add_shared_expense',
    description:
      'Add a Splitwise-style shared expense to a group with Equal, Exact, Percentage, Shares, or Fairness Preset splitting.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        groupNameOrId: { type: Type.STRING },
        title: { type: Type.STRING },
        totalAmount: { type: Type.NUMBER },
        category: { type: Type.STRING },
        paidByMemberName: { type: Type.STRING },
        splitMethod: {
          type: Type.STRING,
          description:
            "One of: 'equal', 'exact', 'percentage', 'shares'.",
        },
        participantNames: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        customAllocations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              memberName: { type: Type.STRING },
              value: { type: Type.NUMBER },
            },
            required: ['memberName', 'value'],
          },
        },
      },
      required: ['groupNameOrId', 'title', 'totalAmount', 'category'],
    },
  },
  {
    name: 'create_split_group',
    description: 'Create a new Splitwise-style shared expense group.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        fairnessLabel: {
          type: Type.STRING,
          description: "e.g. 'Equal' or '60/40 Fairness Preset'",
        },
        memberNames: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'settle_group_debt',
    description: 'Record a settlement transfer between two members in a group.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        groupNameOrId: { type: Type.STRING },
        fromMemberName: { type: Type.STRING },
        toMemberName: { type: Type.STRING },
        amount: { type: Type.NUMBER },
      },
      required: ['groupNameOrId', 'fromMemberName', 'toMemberName'],
    },
  },
  {
    name: 'generate_share_link',
    description:
      'Publish and generate a no-login shareable settlement summary URL for a group.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        groupNameOrId: { type: Type.STRING },
      },
      required: ['groupNameOrId'],
    },
  },
  {
    name: 'post_recurring_bill',
    description:
      'Post a recurring monthly group bill (like Rent or Fiber Internet) right now.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        billTitleOrId: { type: Type.STRING },
      },
      required: ['billTitleOrId'],
    },
  },
  {
    name: 'handle_agent_suggestion',
    description:
      'Apply, open draft email for, or dismiss a pending alert in the Agentic Inbox.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        suggestionIdOrKeyword: { type: Type.STRING },
        decision: { type: Type.STRING, description: "'apply' or 'dismiss'" },
      },
      required: ['suggestionIdOrKeyword', 'decision'],
    },
  },
  {
    name: 'create_automation_rule',
    description: 'Create a new smart automation rule.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        merchantKeyword: { type: Type.STRING },
        actionType: { type: Type.STRING, description: "'categorize' or 'split'" },
        targetCategory: { type: Type.STRING },
        targetGroupName: { type: Type.STRING },
      },
      required: ['name', 'merchantKeyword', 'actionType'],
    },
  },
  {
    name: 'toggle_automation_rule',
    description: 'Enable or disable an existing automation rule.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        ruleNameOrId: { type: Type.STRING },
        enabled: { type: Type.BOOLEAN },
      },
      required: ['ruleNameOrId', 'enabled'],
    },
  },
  {
    name: 'toggle_subscription_status',
    description: 'Pause or resume a recurring subscription renewal.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        vendorName: { type: Type.STRING },
        action: { type: Type.STRING, description: "'pause' or 'resume'" },
      },
      required: ['vendorName', 'action'],
    },
  },
  {
    name: 'assign_receipt',
    description:
      'Assign a receipt to Personal Ledger or a Split Group.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        receiptMerchantOrId: { type: Type.STRING },
        target: { type: Type.STRING },
      },
      required: ['receiptMerchantOrId', 'target'],
    },
  },
  {
    name: 'scan_sample_receipt',
    description: 'Trigger a simulated OCR receipt scan in the Receipts Vault.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      contents?: Content[];
      workspaceSnapshot?: unknown;
    };

    if (!Array.isArray(body.contents) || body.contents.length === 0) {
      return NextResponse.json(
        { error: 'Request must include chat contents.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'GEMINI_API_KEY is not configured. Please add it in Settings > Secrets.',
        },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are the Clearspend Agent — an intelligent, action-oriented financial assistant for friends, couples, and roommates.

Live Workspace State (JSON):
${JSON.stringify(body.workspaceSnapshot ?? {}, null, 2)}

Capabilities:
- You can execute everything the app supports via tools: logging/deleting personal expenses, creating Splitwise-style shared bills (equal, exact, percentage, shares), creating groups, settling debts, generating no-login shareable settlement links, posting recurring shared bills, applying/dismissing Agentic Inbox alerts (including refund/cancellation drafts), creating/toggling automation rules, pausing/resuming subscriptions, routing or scanning receipts, and navigating pages.
- You can also run What-If affordability simulations and cash-flow collision checks directly from the live workspace state numbers (monthlyBudgetCap, checkingBuffer, monthlyNetSpend, netYouAreOwed, netYouOwe, recurring bills, and subscriptions).
- Always answer concisely with exact USD figures when reporting balances or simulations.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: body.contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: CLEARSPEND_TOOLS }],
      },
    });

    const candidateContent = response.candidates?.[0]?.content ?? null;
    const functionCalls = response.functionCalls ?? [];
    const replyText = response.text ?? '';

    return NextResponse.json({
      replyText,
      functionCalls,
      candidateContent,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to reach Clearspend Agent.';
    console.error('Next.js Agent API error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
