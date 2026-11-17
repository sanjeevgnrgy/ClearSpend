import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import type { Content, FunctionDeclaration } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

const CLEARSPEND_TOOLS: FunctionDeclaration[] = [
  {
    name: "navigate_page",
    description:
      "Navigate the user to a specific page in the Clearspend application.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: {
          type: Type.STRING,
          description:
            "Target page: 'landing', 'overview', 'splits', 'automations', 'analytics', or 'receipts'.",
        },
      },
      required: ["page"],
    },
  },
  {
    name: "add_personal_expense",
    description:
      "Log a new personal expense transaction into the user's ledger.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchant: {
          type: Type.STRING,
          description: "Merchant or expense title, e.g. 'Blue Bottle Coffee'.",
        },
        amount: {
          type: Type.NUMBER,
          description: "Expense amount in USD, e.g. 18.5.",
        },
        category: {
          type: Type.STRING,
          description:
            "One of: 'Dining', 'Software', 'Travel', 'Groceries', 'Utilities', 'Housing'.",
        },
        note: {
          type: Type.STRING,
          description: "Optional short note describing the purchase.",
        },
      },
      required: ["merchant", "amount", "category"],
    },
  },
  {
    name: "delete_personal_expense",
    description:
      "Remove a personal expense from the ledger by matching its merchant name or ID.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        merchantOrId: {
          type: Type.STRING,
          description: "Transaction ID or merchant name substring to delete.",
        },
      },
      required: ["merchantOrId"],
    },
  },
  {
    name: "add_shared_expense",
    description:
      "Add a Splitwise-style shared expense to a group with Equal, Exact, Percentage, or Shares splitting.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        groupNameOrId: {
          type: Type.STRING,
          description:
            "Group name or ID, e.g. 'Lisbon Trip', 'Apartment 4B', or 'Design Offsite'.",
        },
        title: {
          type: Type.STRING,
          description: "Description of the shared expense, e.g. 'Tapas Dinner'.",
        },
        totalAmount: {
          type: Type.NUMBER,
          description: "Total bill amount in USD.",
        },
        category: {
          type: Type.STRING,
          description:
            "One of: 'Dining', 'Software', 'Travel', 'Groceries', 'Utilities', 'Housing'.",
        },
        paidByMemberName: {
          type: Type.STRING,
          description:
            "Name of the person who paid, e.g. 'Alex', 'Maya', 'Liam', or 'Samira'. Defaults to Alex (You).",
        },
        splitMethod: {
          type: Type.STRING,
          description:
            "One of: 'equal', 'exact', 'percentage', or 'shares'. Defaults to 'equal'.",
        },
        participantNames: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Optional list of member first names included in an equal split. Defaults to all group members.",
        },
        customAllocations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              memberName: { type: Type.STRING },
              value: {
                type: Type.NUMBER,
                description:
                  "Dollar amount for 'exact', percent (0-100) for 'percentage', or share weight for 'shares'.",
              },
            },
            required: ["memberName", "value"],
          },
          description:
            "Required when splitMethod is 'exact', 'percentage', or 'shares'.",
        },
      },
      required: ["groupNameOrId", "title", "totalAmount", "category"],
    },
  },
  {
    name: "create_split_group",
    description: "Create a new Splitwise-style shared expense group.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Name of the new group, e.g. 'Tahoe Ski Weekend'.",
        },
        description: {
          type: Type.STRING,
          description: "Short description of what the group tracks.",
        },
        memberNames: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "First names of friends to include alongside Alex (e.g. ['Maya', 'Liam']).",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "settle_group_debt",
    description:
      "Record a settlement payment between two members in a Splitwise group.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        groupNameOrId: {
          type: Type.STRING,
          description: "Group name or ID where the debt exists.",
        },
        fromMemberName: {
          type: Type.STRING,
          description: "Member paying the settlement, e.g. 'Liam'.",
        },
        toMemberName: {
          type: Type.STRING,
          description: "Member receiving the settlement, e.g. 'Alex'.",
        },
        amount: {
          type: Type.NUMBER,
          description:
            "Amount settled in USD. If omitted, settles the full suggested simplified transfer between these members.",
        },
      },
      required: ["groupNameOrId", "fromMemberName", "toMemberName"],
    },
  },
  {
    name: "handle_agent_suggestion",
    description:
      "Apply or dismiss a pending alert/suggestion in the Agentic Inbox.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        suggestionIdOrKeyword: {
          type: Type.STRING,
          description:
            "Suggestion ID (e.g. 'ag-1') or keyword from its title (e.g. 'Figma', 'Trader Joe', 'Notion', 'Lisbon').",
        },
        decision: {
          type: Type.STRING,
          description: "Either 'apply' or 'dismiss'.",
        },
      },
      required: ["suggestionIdOrKeyword", "decision"],
    },
  },
  {
    name: "create_automation_rule",
    description:
      "Create a new smart automation rule for incoming transactions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description: "Human-readable rule title.",
        },
        merchantKeyword: {
          type: Type.STRING,
          description: "Merchant name or keyword to match.",
        },
        actionType: {
          type: Type.STRING,
          description: "Either 'categorize' or 'split'.",
        },
        targetCategory: {
          type: Type.STRING,
          description: "Category if actionType is 'categorize'.",
        },
        targetGroupName: {
          type: Type.STRING,
          description: "Group name if actionType is 'split'.",
        },
      },
      required: ["name", "merchantKeyword", "actionType"],
    },
  },
  {
    name: "toggle_automation_rule",
    description: "Enable or disable an existing automation rule.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ruleNameOrId: {
          type: Type.STRING,
          description: "Rule ID or keyword from rule name.",
        },
        enabled: {
          type: Type.BOOLEAN,
          description: "True to enable, false to disable.",
        },
      },
      required: ["ruleNameOrId", "enabled"],
    },
  },
  {
    name: "toggle_subscription_status",
    description: "Pause or resume a recurring SaaS subscription renewal.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        vendorName: {
          type: Type.STRING,
          description:
            "Subscription vendor name, e.g. 'Notion Workspace', 'Figma', 'Vercel'.",
        },
        action: {
          type: Type.STRING,
          description: "Either 'pause' or 'resume'.",
        },
      },
      required: ["vendorName", "action"],
    },
  },
  {
    name: "assign_receipt",
    description:
      "Route a scanned receipt in the Receipts Vault to Personal Ledger or a Split Group.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        receiptMerchantOrId: {
          type: Type.STRING,
          description:
            "Receipt ID or merchant keyword, e.g. 'Daily Grind' or 'Mercadona'.",
        },
        target: {
          type: Type.STRING,
          description:
            "Target destination: 'personal' or the name of a Split Group (e.g. 'Lisbon Trip').",
        },
      },
      required: ["receiptMerchantOrId", "target"],
    },
  },
  {
    name: "scan_sample_receipt",
    description:
      "Trigger a simulated OCR scan of a new sample receipt in the Receipts Vault.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.post("/api/agent/chat", async (req: Request, res: Response) => {
    try {
      const { contents, workspaceSnapshot } = req.body as {
        contents?: Content[];
        workspaceSnapshot?: unknown;
      };

      if (!Array.isArray(contents) || contents.length === 0) {
        res.status(400).json({ error: "Request must include chat contents." });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(503).json({
          error:
            "Gemini API key is not set. Please configure GEMINI_API_KEY in Settings > Secrets.",
        });
        return;
      }

      const ai = getAiClient();
      const systemInstruction = `You are the Clearspend Agent — an intelligent, action-oriented financial assistant built into the Clearspend expense tracker and Splitwise-style bill splitting application.

Current User: Alex Rivera (member id: m-you).
Available categories: Dining, Software, Travel, Groceries, Utilities, Housing.
Available pages: landing, overview, splits, automations, analytics, receipts.

Live Workspace State (JSON):
${JSON.stringify(workspaceSnapshot ?? {}, null, 2)}

Rules:
1. You can do EVERYTHING the application supports via your tools: add/delete personal expenses, create Splitwise-style shared expenses (equal, exact, percentage, or shares), create groups, settle debts, apply/dismiss Agentic Inbox suggestions, create/toggle automation rules, pause/resume subscriptions, scan/assign receipts, and navigate between pages.
2. Whenever the user asks to perform an action, immediately call the appropriate tool(s) with accurate arguments based on the Live Workspace State.
3. For read-only questions (balances, who owes whom, monthly spending, remaining budget, subscriptions), answer concisely and accurately using exact numbers from the Live Workspace State formatted as USD (e.g., $137.00).
4. After tool execution results are returned to you, summarize clearly and concisely what was updated in the app. Keep responses crisp, structured, and free of fluff.`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: CLEARSPEND_TOOLS }],
        },
      });

      const candidateContent = response.candidates?.[0]?.content ?? null;
      const functionCalls = response.functionCalls ?? [];
      const replyText = response.text ?? "";

      res.json({
        replyText,
        functionCalls,
        candidateContent,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reach Gemini agent.";
      console.error("Agent API error:", err);
      res.status(500).json({ error: message });
    }
  });

  if (isProduction) {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Clearspend server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
