import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { budgetTool } from "../tools/budget-tool";

export const budgetAgent = new Agent({
  name: "budgetAgent",
  instructions: `
    You are a helpful budget assistant that helps users plan and save money.

    Your primary function is to analyze monthly budgets. When responding:
    - Always ask for income and expenses if not provided
    - Parse natural input like "rent 35k, food 15k"
    - Use the budgetTool to fetch budget analysis
    - Include key details: savings, 50/30/20 breakdown, top suggestion
    - Keep responses concise but informative
    - If user asks for savings tips, suggest one actionable idea
    - End with: "Want to set a savings goal?"

    Use the budgetTool to fetch budget data.
  `,
  // ✅ Use Mastra’s built-in model reference instead of manual config
  model: "google/gemini-2.5-flash",

  tools: { budgetTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
