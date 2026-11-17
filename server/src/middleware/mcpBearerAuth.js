
import crypto from "node:crypto";

export const mcpBearerAuth = (req, res, next) => {
  const expectedToken = process.env.MCP_BEARER_TOKEN;
  const authHeader = req.headers.authorization;

  if (!expectedToken || expectedToken.length < 64) {
    return res.status(503).json({
      error: "MCP authentication is not configured"
    });
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "MCP Bearer Token is required"
    });
  }

  const suppliedToken = authHeader.slice(7);

  const expectedBuffer = Buffer.from(expectedToken);
  const suppliedBuffer = Buffer.from(suppliedToken);

  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    return res.status(401).json({
      error: "Invalid MCP Bearer Token"
    });
  }

  next();
};
