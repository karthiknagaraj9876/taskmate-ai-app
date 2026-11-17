
import express from "express";

import { StreamableHTTPServerTransport } from
  "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createTaskmateMcpServer } from "../mcp/taskmateMcpServer.js";
import { mcpBearerAuth } from "../middleware/mcpBearerAuth.js";

const router = express.Router();

// Every MCP request must have the dedicated Bearer Token.
router.use(mcpBearerAuth);

// Stateless Streamable HTTP endpoint.
router.all("/", async (req, res) => {
  const mcpServer = createTaskmateMcpServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  try {
    res.on("close", () => {
      transport.close();
    });

    await mcpServer.connect(transport);

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "MCP server request failed"
      });
    }
  }
});

export default router;
