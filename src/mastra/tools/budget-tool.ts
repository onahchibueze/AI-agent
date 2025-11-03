import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const expenseSchema = z.object({
  name: z.string(),
  amount: z.number().positive(),
});

export const budgetTool = createTool({
  id: "get-budget",
  description: "Analyze monthly budget and suggest savings",
  inputSchema: z.object({
    income: z.number().positive("Income required"),
    expenses: z.array(expenseSchema).optional(),
  }),
  outputSchema: z.object({
    totalSpent: z.number(),
    savings: z.number(),
    saveRate: z.number(),
    needs: z.number(),
    wants: z.number(),
    suggestions: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { income, expenses = [] } = context;

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const savings = income - totalSpent;
    const saveRate = income > 0 ? (savings / income) * 100 : 0;

    const needs = expenses
      .filter((e) =>
        ["rent", "transport", "bills"].some((cat) =>
          e.name.toLowerCase().includes(cat)
        )
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const wants = expenses
      .filter((e) =>
        ["food", "data", "entertainment"].some((cat) =>
          e.name.toLowerCase().includes(cat)
        )
      )
      .reduce((sum, e) => sum + e.amount, 0);

    const suggestions: string[] = [];
    if (needs > income * 0.5)
      suggestions.push("Needs > 50%. Cut rent or transport");
    if (wants > income * 0.3)
      suggestions.push("Wants > 30%. Reduce food or data");
    if (saveRate < 20)
      suggestions.push(
        `Save ₦${(income * 0.2 - savings).toFixed(0)} more for 20% goal`
      );

    return { totalSpent, savings, saveRate, needs, wants, suggestions };
  },
});
