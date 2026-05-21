import { useParams, useLocation } from "wouter";
import { useReport } from "@/hooks/use-reports";
import { useEffect, useRef, useState } from "react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BarChart2, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function AutoAnalyze() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const reportId = params.id ? parseInt(params.id) : null;
  const { data: report, isLoading } = useReport(reportId);

  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState("");
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!report || hasStarted.current) return;
    hasStarted.current = true;

    const analysis = (report.analysis as any) || {};
    const funds: any[] = (analysis.mf_snapshot || []).filter((mf: any) => mf.isin);

    if (!funds.length) {
      navigate(`/reports/${report.id}/concise`);
      return;
    }

    setTotal(funds.length);

    const runAll = async () => {
      setCurrent("Fetching data for all funds…");

      const res = await fetch(`/api/bulk-performance?reportId=${report.id}`);
      if (!res.ok) throw new Error(`Bulk fetch failed: ${res.status}`);
      const { performances, scoringRecords } = await res.json();

      setDone(funds.length);
      setProgress(100);

      try {
        localStorage.setItem(`fin_perf_${report.id}`, JSON.stringify(performances));
        localStorage.setItem(`fin_scoring_${report.id}`, JSON.stringify(scoringRecords));
      } catch (_) {}

      setCompleted(true);
      setTimeout(() => navigate(`/reports/${report.id}/concise`), 800);
    };

    runAll().catch((err) => setError(err.message));
  }, [report]);

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden flex flex-col">
      <AnimatedBackground />

      {/* Navbar */}
      <nav
        className="border-b"
        style={{
          background: "rgba(10, 14, 46, 0.6)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(96, 165, 250, 0.15)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3b6fff, #9333ea)",
                boxShadow: "0 0 16px rgba(59,111,255,0.5)",
              }}
            >
              <BarChart2 className="w-5 h-5" />
            </div>
            <span
              className="text-xl font-bold font-display"
              style={{
                background: "linear-gradient(90deg, #60a5fa, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              CasAnalyser
            </span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <div
          className="w-full max-w-md rounded-2xl border p-8 text-center space-y-6"
          style={{
            background: "rgba(10, 14, 46, 0.75)",
            borderColor: "rgba(96, 165, 250, 0.2)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 0 60px rgba(59,111,255,0.15)",
          }}
        >
          {error ? (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-rose-400" />
              <h2 className="text-xl font-bold text-rose-300">Analysis failed</h2>
              <p className="text-sm text-slate-400">{error}</p>
              <button
                onClick={() => navigate("/")}
                className="text-blue-400 underline text-sm"
              >
                Back to home
              </button>
            </>
          ) : completed ? (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
              <h2 className="text-xl font-bold" style={{ color: "#e2e8f0" }}>
                Analysis complete!
              </h2>
              <p className="text-sm text-slate-400">Opening your concise report…</p>
            </>
          ) : isLoading || !report ? (
            <>
              <Loader2 className="w-12 h-12 mx-auto animate-spin" style={{ color: "#60a5fa" }} />
              <h2 className="text-xl font-bold" style={{ color: "#e2e8f0" }}>
                Loading portfolio…
              </h2>
            </>
          ) : (
            <>
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
                style={{ background: "rgba(59,111,255,0.15)" }}
              >
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#60a5fa" }} />
              </div>

              <div>
                <h2 className="text-xl font-bold mb-1" style={{ color: "#e2e8f0" }}>
                  Analysing your portfolio
                </h2>
                <p className="text-sm text-slate-400">
                  Running risk metrics for all funds. Please wait…
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{done} of {total} funds</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, #3b6fff, #9333ea)",
                    }}
                  />
                </div>
              </div>

              {current && (
                <p
                  className="text-xs truncate px-2"
                  style={{ color: "rgba(148,163,184,0.7)" }}
                  title={current}
                >
                  {current}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
