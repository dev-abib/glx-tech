import { Router, type Response } from "express";
import { swaggerSpec } from "../config/swagger.js";

const router = Router();

// ── Serve swagger spec as JSON ─────────────────────────────────────────────
router.get("/api-docs.json", (_req, res: Response) => {
  res.json(swaggerSpec);
});

// ── Custom Swagger UI HTML (loads assets from CDN for Vercel compatibility) ─
router.get("/api-docs", (_req, res: Response) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nexus API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 0 0 10px }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api-docs.json",
        dom_id: "#swagger-ui",
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        docExpansion: "list",
        filter: true,
        tagsSorter: "alpha",
        operationsSorter: "alpha",
      });
    };
  </script>
</body>
</html>`);
});

export default router;
