import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type Report } from "@shared/schema";

// Helper for type safety when handling the flexible JSON analysis structure
export interface AnalysisResult {
  summary: string;
  holdings: Array<{ name: string; value: number; type: string }>;
  allocation: Record<string, number>;
  insights: string[];
}

export interface EnhancedReport extends Omit<Report, "analysis"> {
  analysis: AnalysisResult;
}

// GET /api/reports
export function useReports() {
  return useQuery({
    queryKey: [api.reports.list.path],
    queryFn: async () => {
      const res = await fetch(api.reports.list.path);
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      return api.reports.list.responses[200].parse(data) as EnhancedReport[];
    },
  });
}

// GET /api/reports/:id
export function useReport(id: number | null) {
  return useQuery({
    queryKey: [api.reports.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const url = api.reports.get.path.replace(":id", id.toString());
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch report");
      const data = await res.json();
      return api.reports.get.responses[200].parse(data) as EnhancedReport;
    },
  });
}

// POST /api/analyze — starts job, then polls /api/analyze/status/:jobId
export function useAnalyzeReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, password, investorType, ageGroup }: { file: File; password?: string; investorType?: string; ageGroup?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (password) formData.append("password", password);
      if (investorType) formData.append("investorType", investorType);
      if (ageGroup) formData.append("ageGroup", ageGroup);

      // Step 1: POST to start the job — returns immediately with a jobId
      const startRes = await fetch(api.analyze.path, {
        method: api.analyze.method,
        body: formData,
      });

      if (!startRes.ok) {
        const errData = await startRes.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to start analysis. Please check your file/password.");
      }

      const { jobId } = await startRes.json();

      // Step 2: Poll the status endpoint every 3 seconds (up to 5 minutes)
      const statusUrl = api.analyzeStatus.path.replace(":jobId", jobId);
      const deadline = Date.now() + 5 * 60 * 1000; // 5-minute polling budget

      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const statusRes = await fetch(statusUrl);
        if (!statusRes.ok) throw new Error("Lost track of analysis job. Please try again.");

        const status = await statusRes.json();

        if (status.status === "done") {
          return status.report as EnhancedReport;
        }
        if (status.status === "error") {
          throw new Error(status.message || "Analysis failed. Please check your file/password.");
        }
        // status === "processing" → keep polling
      }

      throw new Error("Analysis is taking too long. Please try again or use a smaller PDF.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reports.list.path] });
    },
  });
}
