// routes/budget-agent-route.ts
import { registerApiRoute } from "@mastra/core/server";
import { randomUUID } from "node:crypto";

export const budgetAgentRoute = registerApiRoute("/a2a/agent/:agentId", {
  method: "POST",
  handler: async (c) => {
    try {
      const mastra = c.get("mastra");
      const agentId = c.req.param("agentId");

      const body = await c.req.json();
      const { jsonrpc, id: requestId, params } = body;

      if (jsonrpc !== "2.0" || !requestId) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId || null,
            error: {
              code: -32600,
              message:
                'Invalid Request: jsonrpc must be "2.0" and id is required',
            },
          },
          400
        );
      }

      // Get agent
      const agent = mastra.getAgent(agentId);
      if (!agent) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId,
            error: { code: -32602, message: `Agent '${agentId}' not found` },
          },
          404
        );
      }

      const { message, messages, contextId, taskId } = params || {};
      const messagesList = message
        ? [message]
        : Array.isArray(messages)
          ? messages
          : [];

      const mastraMessages = messagesList.map((msg) => ({
        role: msg.role || "user",
        content:
          msg.parts
            ?.map((p) => (p.kind === "text" ? p.text : JSON.stringify(p.data)))
            .join("\n") || "",
      }));

      const response = await agent.generate(mastraMessages);
      const agentText = response.text || "";

      const artifacts = [
        {
          artifactId: randomUUID(),
          name: `${agentId}Response`,
          parts: [{ kind: "text", text: agentText }],
        },
      ];

      if (response.toolResults?.length) {
        artifacts.push({
          artifactId: randomUUID(),
          name: "ToolResults",
          parts: response.toolResults.map((result) => ({
            kind: "data",
            data: result,
          })),
        });
      }

      // Build conversation history
      const history = [
        ...messagesList.map((msg) => ({
          kind: "message",
          role: msg.role || "user",
          parts: msg.parts,
          messageId: msg.messageId || randomUUID(),
          taskId: msg.taskId || taskId || randomUUID(),
        })),
        {
          kind: "message",
          role: "agent",
          parts: [{ kind: "text", text: agentText }],
          messageId: randomUUID(),
          taskId: taskId || randomUUID(),
        },
      ];

      return c.json({
        jsonrpc: "2.0",
        id: requestId,
        result: {
          id: taskId || randomUUID(),
          contextId: contextId || randomUUID(),
          status: {
            state: "completed",
            timestamp: new Date().toISOString(),
            message: {
              messageId: randomUUID(),
              role: "agent",
              parts: [{ kind: "text", text: agentText }],
              kind: "message",
            },
          },
          artifacts,
          history,
          kind: "task",
        },
      });
    } catch (error: any) {
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32603,
            message: "Internal error",
            data: { details: error.message },
          },
        },
        500
      );
    }
  },
});
