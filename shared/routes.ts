import { z } from "zod";
import { reports } from "./schema";

export const api = {
  analyze: {
    method: "POST" as const,
    path: "/api/analyze",
    // Input is FormData (file + password), so no strict Zod schema for body here
    responses: {
      202: z.object({ jobId: z.string() }), // Accepted — returns job ID for polling
      400: z.object({ message: z.string() }),
      401: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
  },
  analyzeStatus: {
    method: "GET" as const,
    path: "/api/analyze/status/:jobId",
    responses: {
      200: z.object({
        status: z.enum(["processing", "done", "error"]),
        report: z.custom<typeof reports.$inferSelect>().optional(),
        message: z.string().optional(),
      }),
      404: z.object({ message: z.string() }),
    },
  },
  reports: {
    list: {
      method: "GET" as const,
      path: "/api/reports",
      responses: {
        200: z.array(z.custom<typeof reports.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/reports/:slug",
      responses: {
        200: z.custom<typeof reports.$inferSelect>(),
        404: z.object({ message: z.string() }),
      },
    },
  },
};
