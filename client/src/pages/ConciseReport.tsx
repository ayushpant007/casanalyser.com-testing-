import { useParams, useLocation } from "wouter";
import { useReport } from "@/hooks/use-reports";
import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ArrowLeft, Calendar, CalendarDays, TrendingUp, TrendingDown, FileSpreadsheet, TrendingUpIcon, Zap, Mail, Phone, MessageCircle, Wallet, IndianRupee, Layers, Sparkles, Search, X, ChevronUp, Shield, Target, Activity, AlertTriangle, ArrowUpRight, SortAsc, SortDesc, Eye, ChevronDown, Sun, Moon, RefreshCcw } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, Area, AreaChart } from "recharts";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { BarChart2 } from "lucide-react";

const IDEAL_ALLOCATIONS: Record<string, Record<string, Record<string, string>>> = {
  "20-35": {
    "High Aggressive": { "Equity": "85%", "Debt": "5%", "Hybrid": "0%", "Gold/Silver": "5%", "Others": "5%" },
    "Aggressive": { "Equity": "75%", "Debt": "10%", "Hybrid": "5%", "Gold/Silver": "5%", "Others": "5%" },
    "Moderate": { "Equity": "60%", "Debt": "20%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" },
    "Conservative": { "Equity": "40%", "Debt": "35%", "Hybrid": "15%", "Gold/Silver": "5%", "Others": "5%" }
  },
  "35-50": {
    "High Aggressive": { "Equity": "75%", "Debt": "10%", "Hybrid": "5%", "Gold/Silver": "5%", "Others": "5%" },
    "Aggressive": { "Equity": "65%", "Debt": "15%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" },
    "Moderate": { "Equity": "50%", "Debt": "30%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" },
    "Conservative": { "Equity": "30%", "Debt": "50%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" }
  },
  "50-60": {
    "High Aggressive": { "Equity": "65%", "Debt": "15%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" },
    "Aggressive": { "Equity": "50%", "Debt": "30%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" },
    "Moderate": { "Equity": "35%", "Debt": "45%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" },
    "Conservative": { "Equity": "20%", "Debt": "65%", "Hybrid": "5%", "Gold/Silver": "5%", "Others": "5%" }
  },
  "60+": {
    "High Aggressive": { "Equity": "40%", "Debt": "40%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" },
    "Aggressive": { "Equity": "30%", "Debt": "50%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" },
    "Moderate": { "Equity": "20%", "Debt": "60%", "Hybrid": "10%", "Gold/Silver": "5%", "Others": "5%" },
    "Conservative": { "Equity": "10%", "Debt": "75%", "Hybrid": "5%", "Gold/Silver": "5%", "Others": "5%" }
  }
};

const CATEGORY_META: Record<string, { color: string }> = {
  "Equity":      { color: "#3b82f6" },
  "Debt":        { color: "#f59e0b" },
  "Hybrid":      { color: "#94a3b8" },
  "Gold/Silver": { color: "#d97706" },
  "Others":      { color: "#10b981" },
};

function calcPerfScore(schemeReturns: any, benchmarkReturns: any) {
  if (!schemeReturns || !benchmarkReturns) return { total: 0, breakDown: { "1y": 0, "3y": 0, "5y": 0 } };
  const pv = (v: string) => parseFloat(v?.replace(/[^\d.-]/g, "") || "0");
  const diff1 = pv(schemeReturns["1y"]) - pv(benchmarkReturns["1y"]);
  const diff3 = pv(schemeReturns["3y"]) - pv(benchmarkReturns["3y"]);
  const diff5 = pv(schemeReturns["5y"]) - pv(benchmarkReturns["5y"]);
  const s1 = diff1 >= 3 ? 10 : diff1 >= 1.5 ? 8 : diff1 >= 0 ? 6 : diff1 >= -1.49 ? 4 : diff1 >= -2.99 ? 2 : 0;
  const s3 = diff3 >= 3 ? 15 : diff3 >= 1.5 ? 13 : diff3 >= 0 ? 11 : diff3 >= -1.49 ? 9 : diff3 >= -2.99 ? 7 : 0;
  const s5 = diff5 >= 3 ? 15 : diff5 >= 1.5 ? 13 : diff5 >= 0 ? 11 : diff5 >= -1.49 ? 9 : diff5 >= -2.99 ? 7 : 0;
  return { total: s1 + s3 + s5, breakDown: { "1y": s1, "3y": s3, "5y": s5 } };
}

const ACTION_STYLES: Record<string, string> = {
  hold:   "bg-blue-50 text-blue-700 border-blue-200",
  switch: "bg-amber-50 text-amber-700 border-amber-200",
  merge:  "bg-violet-50 text-violet-700 border-violet-200",
  sell:   "bg-rose-50 text-rose-700 border-rose-200",
};

function AnimatedCounter({ value, prefix = "", suffix = "", duration = 1400, decimals = 0, className = "" }: {
  value: number; prefix?: string; suffix?: string; duration?: number; decimals?: number; className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(parseFloat((value * eased).toFixed(decimals)));
      if (progress < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration, decimals]);
  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString("en-IN");
  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}

function HealthGauge({ score }: { score: number }) {
  const r = 46; const cx = 60; const cy = 60;
  const startAngle = -210; const totalAngle = 240;
  const toXY = (a: number) => ({ x: cx + r * Math.cos((a * Math.PI) / 180), y: cy + r * Math.sin((a * Math.PI) / 180) });
  const arc = (s: number, e: number) => {
    const sp = toXY(s); const ep = toXY(e);
    return `M ${sp.x} ${sp.y} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${ep.x} ${ep.y}`;
  };
  const fillEnd = startAngle + (Math.max(0, Math.min(score, 100)) / 100) * totalAngle;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Poor";
  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={85} viewBox="0 0 120 85">
        <path d={arc(startAngle, startAngle + totalAngle)} fill="none" stroke="#e2e8f0" strokeWidth={9} strokeLinecap="round" />
        {score > 0 && <path d={arc(startAngle, fillEnd)} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" />}
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize={19} fontWeight={800} fill={color}>{score}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight={600}>/ 100</text>
      </svg>
      <div className="text-[11px] font-bold -mt-1" style={{ color }}>{label}</div>
      <div className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-widest">Health Score</div>
    </div>
  );
}

function FundDetailModal({ fund, perf, scoring, onClose }: { fund: any; perf: any; scoring: any; onClose: () => void }) {
  const pv = (v: string | undefined) => parseFloat((v || "0").replace(/[^\d.-]/g, "") || "0");
  const bm = perf?.benchmark_returns || {};
  const cagr = perf?.cagr || {};
  const isDemat = fund.source === "demat";
  const pl = isDemat ? null : (fund.valuation || 0) - (fund.invested_amount || 0);
  const plPct = (!isDemat && fund.invested_amount > 0) ? ((pl! / fund.invested_amount) * 100) : null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-5 py-4 text-white rounded-t-2xl">
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200 mb-1">
            {fund.fund_category || "—"} · {fund.fund_type || "—"}
            {isDemat && <span className="ml-2 px-1.5 py-0.5 rounded bg-white/15 text-[9px] font-bold tracking-wider">DEMAT</span>}
          </p>
          <h3 className="text-sm font-bold text-white leading-tight pr-8">{fund.scheme_name}</h3>
          <p className="text-[10px] text-violet-300 mt-0.5 font-mono">{fund.isin}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Invested", value: isDemat ? "—" : `₹${(fund.invested_amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, cls: "text-slate-800" },
              { label: "Current Value", value: `₹${(fund.valuation || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, cls: "text-slate-800" },
              { label: plPct != null ? `P/L (${plPct >= 0 ? "+" : ""}${plPct.toFixed(1)}%)` : "P/L", value: pl != null ? `${pl >= 0 ? "+" : "-"}₹${Math.abs(pl).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—", cls: pl != null ? (pl >= 0 ? "text-emerald-600" : "text-rose-600") : "text-slate-400" },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-100">
                <p className="text-[9px] text-slate-400 font-semibold mb-1 uppercase tracking-wide">{item.label}</p>
                <p className={`text-xs font-bold ${item.cls}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Units</p>
              <p className="text-sm font-bold text-slate-800">{(fund.units || fund.closing_balance || 0).toFixed(3)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-1">NAV</p>
              <p className="text-sm font-bold text-slate-800">₹{(fund.nav || 0).toFixed(4)}</p>
            </div>
          </div>
          {perf && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">CAGR vs Benchmark</p>
              <div className="space-y-2.5">
                {(["1y", "3y", "5y"] as const).map(period => {
                  const cv = pv(cagr[period]); const bv = pv(bm[period]); const beating = cv >= bv;
                  return (
                    <div key={period} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 w-5 uppercase">{period}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(Math.abs(cv) * 3, 100)}%`, backgroundColor: beating ? "#10b981" : "#ef4444" }} />
                      </div>
                      <span className={`text-[11px] font-bold w-12 text-right ${beating ? "text-emerald-600" : "text-rose-600"}`}>{cv > 0 ? "+" : ""}{cv.toFixed(2)}%</span>
                      <span className="text-[10px] text-slate-400 w-12 text-right">
                        {(bm[period] && bm[period] !== "N/A") ? `BM:${bv.toFixed(1)}%` : "BM:N/A"}
                      </span>
                    </div>
                  );
                })}
              </div>
              {(["1y", "3y", "5y"] as const).every(p => !bm[p] || bm[p] === "N/A") && (
                <p className="mt-2.5 text-[11px] text-slate-400 italic">
                  Benchmark data is currently unavailable for this scheme at the moment.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConciseReport() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const reportId = params.id ? parseInt(params.id) : null;
  const { data: report, isLoading } = useReport(reportId);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [actionSelections, setActionSelections] = useState<Record<string, string>>(() => {
    if (!reportId) return {};
    try { return JSON.parse(localStorage.getItem(`fin_actions_${reportId}`) || "{}"); } catch { return {}; }
  });

  const updateAction = (schemeName: string, value: string) => {
    setActionSelections(prev => {
      const next = { ...prev, [schemeName]: value };
      if (reportId) localStorage.setItem(`fin_actions_${reportId}`, JSON.stringify(next));
      return next;
    });
  };

  const [targetCategory, setTargetCategory] = useState<Record<string, string>>(() => {
    if (!reportId) return {};
    try { return JSON.parse(localStorage.getItem(`fin_target_cat_${reportId}`) || "{}"); } catch { return {}; }
  });

  const [targetFund, setTargetFund] = useState<Record<string, string>>(() => {
    if (!reportId) return {};
    try { return JSON.parse(localStorage.getItem(`fin_target_fund_${reportId}`) || "{}"); } catch { return {}; }
  });

  const [targetSubCategory, setTargetSubCategory] = useState<Record<string, string>>(() => {
    if (!reportId) return {};
    try { return JSON.parse(localStorage.getItem(`fin_target_subcat_${reportId}`) || "{}"); } catch { return {}; }
  });

  const updateTargetCategory = useCallback((schemeName: string, value: string) => {
    setTargetCategory(prev => {
      const next = { ...prev, [schemeName]: value };
      if (reportId) localStorage.setItem(`fin_target_cat_${reportId}`, JSON.stringify(next));
      return next;
    });
    // Reset subcategory and fund when category changes
    setTargetSubCategory(prev => {
      const next = { ...prev, [schemeName]: "" };
      if (reportId) localStorage.setItem(`fin_target_subcat_${reportId}`, JSON.stringify(next));
      return next;
    });
    setTargetFund(prev => {
      const next = { ...prev, [schemeName]: "" };
      if (reportId) localStorage.setItem(`fin_target_fund_${reportId}`, JSON.stringify(next));
      return next;
    });
  }, [reportId]);

  const updateTargetSubCategory = useCallback((schemeName: string, value: string) => {
    setTargetSubCategory(prev => {
      const next = { ...prev, [schemeName]: value };
      if (reportId) localStorage.setItem(`fin_target_subcat_${reportId}`, JSON.stringify(next));
      return next;
    });
    // Reset fund when subcategory changes
    setTargetFund(prev => {
      const next = { ...prev, [schemeName]: "" };
      if (reportId) localStorage.setItem(`fin_target_fund_${reportId}`, JSON.stringify(next));
      return next;
    });
  }, [reportId]);

  const updateTargetFund = useCallback((schemeName: string, value: string) => {
    setTargetFund(prev => {
      const next = { ...prev, [schemeName]: value };
      if (reportId) localStorage.setItem(`fin_target_fund_${reportId}`, JSON.stringify(next));
      return next;
    });
  }, [reportId]);

  const [remarks, setRemarks] = useState<Record<string, string>>(() => {
    if (!reportId) return {};
    try { return JSON.parse(localStorage.getItem(`fin_remarks_${reportId}`) || "{}"); } catch { return {}; }
  });

  const updateRemarks = useCallback((schemeName: string, value: string) => {
    setRemarks(prev => {
      const next = { ...prev, [schemeName]: value };
      if (reportId) localStorage.setItem(`fin_remarks_${reportId}`, JSON.stringify(next));
      return next;
    });
  }, [reportId]);

  const [fundSchemes, setFundSchemes] = useState<string[]>([]);
  const [fundSearchQuery, setFundSearchQuery] = useState<Record<string, string>>({});
  const [openFundDropdown, setOpenFundDropdown] = useState<string | null>(null);

  const [recommendedFunds, setRecommendedFunds] = useState<Array<{ id: string; category: string; subCategory: string; fund: string }>>(() => {
    if (!reportId) return [];
    try { return JSON.parse(localStorage.getItem(`fin_recommended_${reportId}`) || "[]"); } catch { return []; }
  });

  const [schemeData, setSchemeData] = useState<Array<{ category: string; subCategory: string; schemeName: string }>>([]);

  const addRecommendedFund = useCallback(() => {
    const newId = `rec_${Date.now()}`;
    setRecommendedFunds(prev => {
      const next = [...prev, { id: newId, category: "", subCategory: "", fund: "" }];
      if (reportId) localStorage.setItem(`fin_recommended_${reportId}`, JSON.stringify(next));
      return next;
    });
  }, [reportId]);

  const updateRecommendedFund = useCallback((id: string, field: string, value: string) => {
    setRecommendedFunds(prev => {
      const next = prev.map(f => f.id === id ? { ...f, [field]: value } : f);
      if (reportId) localStorage.setItem(`fin_recommended_${reportId}`, JSON.stringify(next));
      return next;
    });
  }, [reportId]);

  const deleteRecommendedFund = useCallback((id: string) => {
    setRecommendedFunds(prev => {
      const next = prev.filter(f => f.id !== id);
      if (reportId) localStorage.setItem(`fin_recommended_${reportId}`, JSON.stringify(next));
      return next;
    });
  }, [reportId]);

  useEffect(() => {
    // Load the scheme data CSV for recommended funds section
    fetch("/attached_assets/All_Scheme_-_All_scheme__1775468244476.csv")
      .then(r => r.text())
      .then(text => {
        const lines = text.split("\n").map(l => l.trim()).filter(l => l);
        const header = lines[0];
        if (header && header.includes("Category") && header.includes("Sub Category") && header.includes("Scheme Name")) {
          const data = lines.slice(1).map(line => {
            // Simple CSV parsing - assumes fields don't have commas inside them
            const parts = line.split(",");
            return {
              category: (parts[0] || "").trim(),
              subCategory: (parts[1] || "").trim(),
              schemeName: (parts[2] || "").trim()
            };
          }).filter(d => d.category && d.subCategory && d.schemeName);
          setSchemeData(data);
        }
      })
      .catch(() => {
        // Fallback to simple fund schemes
        fetch("/fund-schemes.csv")
          .then(r => r.text())
          .then(text => {
            const lines = text.split("\n").map(l => l.trim()).filter(l => l && l !== "Scheme Name");
            setFundSchemes(lines);
          })
          .catch(() => {});
      });
  }, []);

  const [storedPerformances, setStoredPerformances] = useState<Record<string, any>>(() => {
    if (!reportId) return {};
    try { return JSON.parse(localStorage.getItem(`fin_perf_${reportId}`) || "{}"); } catch { return {}; }
  });

  const [storedScoring, setStoredScoring] = useState<Record<string, any>>(() => {
    if (!reportId) return {};
    try { return JSON.parse(localStorage.getItem(`fin_scoring_${reportId}`) || "{}"); } catch { return {}; }
  });

  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });
  const [benchmarkPeriod, setBenchmarkPeriod] = useState<"1y" | "3y">("1y");
  const hasAutoStarted = useRef(false);

  // ── Live Nifty 500 benchmark from Supabase ────────────────────────────────
  const [niftyLive, setNiftyLive] = useState<{ return_1y: number; return_3y: number; as_of_date: string | null; source: string } | null>(null);
  useEffect(() => {
    fetch("/api/nifty-benchmark")
      .then(r => r.json())
      .then(data => setNiftyLive(data))
      .catch(() => {}); // silently fall back to hardcoded
  }, []);

  // ── New UI state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [snapshotSort, setSnapshotSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "value", dir: "desc" });
  const [snapshotSearch, setSnapshotSearch] = useState("");
  const [snapshotGrouped, setSnapshotGrouped] = useState(true);
  const [selectedFundIsin, setSelectedFundIsin] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // ── Section refs for tab navigation ──────────────────────────────────────
  const overviewRef = useRef<HTMLDivElement>(null);
  const benchmarkRef = useRef<HTMLDivElement>(null);
  const allocationRef = useRef<HTMLDivElement>(null);
  const sipHealthRef = useRef<HTMLDivElement>(null);
  const performanceRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 400);
      const sections = [
        { id: "overview", ref: overviewRef },
        { id: "benchmark", ref: benchmarkRef },
        { id: "allocation", ref: allocationRef },
        { id: "sip", ref: sipHealthRef },
        { id: "performance", ref: performanceRef },
        { id: "snapshot", ref: snapshotRef },
      ];
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = sections[i].ref.current;
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveTab(sections[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!report || hasAutoStarted.current) return;
    const analysisData = (report.analysis as any) || {};
    const funds: any[] = (analysisData.mf_snapshot || []).filter((mf: any) => mf.isin);
    if (!funds.length) return;
    const alreadyDone = Object.keys(storedPerformances).length;
    if (alreadyDone >= funds.length) return;
    hasAutoStarted.current = true;
    setIsAutoAnalyzing(true);
    setAnalyzeProgress({ done: alreadyDone, total: funds.length });
    const newPerfs: Record<string, any> = { ...storedPerformances };
    const newScoring: Record<string, any> = { ...storedScoring };
    const analyzeOne = async (mf: any) => {
      const isin = mf.isin;
      if (newPerfs[isin] && newScoring[isin]) return;
      const schemeName = mf.scheme_name || "";
      const plan = schemeName.toLowerCase().includes("direct") ? "Direct" : "Regular";
      const scoringParams = new URLSearchParams({ schemeName, plan });
      const [perfRes, scoringRes] = await Promise.allSettled([
        fetch(`/api/scrape-performance/${isin}?reportId=${reportId}`),
        fetch(`/api/scoring/${encodeURIComponent(isin)}?${scoringParams}`)
      ]);
      if (perfRes.status === "fulfilled" && perfRes.value.ok) {
        const data = await perfRes.value.json();
        newPerfs[isin] = data;
        setStoredPerformances(prev => ({ ...prev, [isin]: data }));
      }
      if (scoringRes.status === "fulfilled" && scoringRes.value.ok) {
        const data = await scoringRes.value.json();
        newScoring[isin] = data;
        setStoredScoring(prev => ({ ...prev, [isin]: data }));
      }
    };
    const runAll = async () => {
      const BATCH = 3;
      for (let i = 0; i < funds.length; i += BATCH) {
        const batch = funds.slice(i, i + BATCH);
        await Promise.all(batch.map(analyzeOne));
        setAnalyzeProgress({ done: Math.min(i + BATCH, funds.length), total: funds.length });
      }
      try {
        localStorage.setItem(`fin_perf_${reportId}`, JSON.stringify(newPerfs));
        localStorage.setItem(`fin_scoring_${reportId}`, JSON.stringify(newScoring));
      } catch (_) {}
      setIsAutoAnalyzing(false);
    };
    runAll().catch(() => setIsAutoAnalyzing(false));
  }, [report]);

  const analysis = (report?.analysis as any) || {};

  const mfSnapshot = useMemo(() => {
    return (analysis.mf_snapshot || []).map((mf: any) => {
      const units = mf.units || mf.closing_balance || 0;

      // Use latest NAV from Risk Metrics performance data if available
      const perfNav = storedPerformances[mf.isin]?.nav?.value;
      if (perfNav && units > 0) {
        const nav = perfNav;
        const valuation = units * nav;
        const unrealised_profit_loss = valuation - (mf.invested_amount || 0);
        return { ...mf, nav, valuation, unrealised_profit_loss };
      }

      // Fallback: CAS-extracted values as-is
      const casNav = mf.nav;
      const nav =
        (casNav == null || casNav === 0) && units && mf.valuation
          ? mf.valuation / units
          : (casNav ?? 0);
      return {
        ...mf,
        nav,
        valuation: mf.valuation ?? 0,
        unrealised_profit_loss: mf.unrealised_profit_loss ?? 0,
      };
    });
  }, [analysis.mf_snapshot, storedPerformances]);

  // Total Invested = exact sum of invested_amount across all funds in mfSnapshot.
  // This matches the "Grand Total" invested column shown at the bottom of the Portfolio Snapshot table.
  const totalInvested = useMemo(
    () => mfSnapshot.reduce((a: number, m: any) => a + (m.invested_amount || 0), 0),
    [mfSnapshot]
  );
  const totalValuation = useMemo(() => {
    return mfSnapshot.reduce((a: number, m: any) => a + (m.valuation || 0), 0);
  }, [mfSnapshot]);
  const totalUnrealised = useMemo(() => mfSnapshot.reduce((a: number, m: any) => a + (m.unrealised_profit_loss || 0), 0), [mfSnapshot]);

  const sipAmounts = useMemo(() => {
    const txns: any[] = analysis.transactions || [];
    if (!txns.length) return {};
    
    // Parse date in CAMS/NSDL format: DD-MMM-YYYY or DD/MM/YYYY
    const parseDate = (dateStr: string): number => {
      if (!dateStr) return 0;
      const trimmed = dateStr.trim();
      
      // Try parsing DD-MMM-YYYY format (e.g., "25-Oct-2020")
      const monthMap: Record<string, string> = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
        "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
      };
      
      const ddMmmYyyyMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (ddMmmYyyyMatch) {
        const [, day, month, year] = ddMmmYyyyMatch;
        const monthNum = monthMap[month] || "01";
        return new Date(`${year}-${monthNum}-${day.padStart(2, "0")}`).getTime();
      }
      
      // Fallback: try standard date parsing
      return new Date(trimmed).getTime();
    };
    
    // Exclusion types and patterns for last transaction (CAMS/NSDL formats)
    const exclusionTypes = new Set(["CANCELLED", "STAMP_DUTY", "SWP", "STP-OUT", "REDEMPTION"]);
    const exclusionPatterns = [
      /cancelled/i,
      /cancel/i,
      /marked\s+duty/i,
      /stamp\s*duty/i,
      /switch.*out/i,
      /redemption/i,
      /exit/i,
    ];
    
    // Group transactions by scheme and sort by date (descending)
    const txnsByScheme: Record<string, any[]> = {};
    txns.forEach((t: any) => {
      if (!t.scheme_name) return;
      if (!txnsByScheme[t.scheme_name]) txnsByScheme[t.scheme_name] = [];
      txnsByScheme[t.scheme_name].push(t);
    });
    
    // Sort each scheme's transactions by date (latest first)
    Object.keys(txnsByScheme).forEach(scheme => {
      txnsByScheme[scheme].sort((a: any, b: any) => {
        const dateA = parseDate(a.date || "");
        const dateB = parseDate(b.date || "");
        return dateB - dateA; // Latest first
      });
    });
    
    // Get last transaction for each scheme and check if it's excluded
    const lastTxnByScheme: Record<string, any> = {};
    Object.entries(txnsByScheme).forEach(([scheme, allTxns]) => {
      const lastTxn = allTxns[0]; // Already sorted by date descending
      if (lastTxn) {
        const typeUpper = (lastTxn.type || "").toUpperCase();
        const isExcludedByType = exclusionTypes.has(typeUpper);
        const isExcludedByPattern = exclusionPatterns.some(p => p.test(lastTxn.type || ""));
        if (!isExcludedByType && !isExcludedByPattern) {
          lastTxnByScheme[scheme] = lastTxn;
        }
      }
    });
    
    // Count SIP/PURCHASE occurrences (excluding schemes with exclusion in last txn)
    const repeatCount: Record<string, number> = {};
    txns.forEach((t: any) => {
      if (!t.scheme_name || !t.amount) return;
      if (!(t.scheme_name in lastTxnByScheme)) return; // Skip if last txn is excluded
      
      const type = (t.type || "").toUpperCase();
      if (type === "SIP" || type === "PURCHASE") {
        const key = `${t.scheme_name}||${Math.round(t.amount)}`;
        repeatCount[key] = (repeatCount[key] || 0) + 1;
      }
    });
    
    // Build final SIP map
    const map: Record<string, number> = {};
    for (const t of txns) {
      if (!t.scheme_name || !t.amount) continue;
      if (!(t.scheme_name in lastTxnByScheme)) continue; // Skip if excluded
      
      const type = (t.type || "").toUpperCase();
      const key = `${t.scheme_name}||${Math.round(t.amount)}`;
      const isTrueSip = type === "SIP" || (type === "PURCHASE" && (repeatCount[key] || 0) >= 2);
      if (isTrueSip && !(t.scheme_name in map)) map[t.scheme_name] = t.amount;
    }
    return map;
  }, [analysis.transactions]);

  const investorName = (() => {
    const raw = (analysis.investor_name as string | undefined)?.trim();
    if (raw && raw.length >= 2) {
      const hasSpace = raw.includes(" ");
      const hasOnlyNameChars = /^[a-zA-Z\s.\-']+$/.test(raw);
      const isAllLowerNoSpace = raw === raw.toLowerCase() && !hasSpace;
      if (hasOnlyNameChars && !isAllLowerNoSpace) return raw;
    }
    if (!report?.filename) return "";
    let name = report.filename.replace(/\.pdf$/i, "");
    name = name.replace(/\s*\([A-Z0-9\-\s]+\)\s*/gi, " ").trim();
    name = name.replace(/\b(CDSL|NSDL|BSE|NSE)\b/gi, "").replace(/\s{2,}/g, " ").trim();
    return name;
  })();

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const CAPTURE_WIDTH = 1200;

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#0a0e2e",
        windowWidth: CAPTURE_WIDTH,
        onclone: (doc: Document, el: HTMLElement) => {
          el.style.setProperty("background", "#0a0e2e", "important");
          el.style.setProperty("padding", "32px", "important");
          el.style.setProperty("width", `${CAPTURE_WIDTH - 64}px`, "important");
          el.style.setProperty("max-width", "none", "important");

          el.querySelectorAll<HTMLElement>("*").forEach(child => {
            const cs = doc.defaultView?.getComputedStyle(child);
            if (!cs) return;

            // Fix overflow clipping
            if (cs.overflow === "hidden" || cs.overflow === "scroll" || cs.overflow === "auto") {
              child.style.setProperty("overflow", "visible", "important");
            }
            if (cs.overflowX === "hidden" || cs.overflowX === "scroll" || cs.overflowX === "auto") {
              child.style.setProperty("overflow-x", "visible", "important");
            }
            if (cs.overflowY === "hidden" || cs.overflowY === "scroll" || cs.overflowY === "auto") {
              child.style.setProperty("overflow-y", "visible", "important");
            }

            // Force-write all flex/grid layout properties so html2canvas sees them
            if (cs.display === "flex" || cs.display === "inline-flex") {
              child.style.setProperty("display", cs.display, "important");
              child.style.setProperty("flex-direction", cs.flexDirection, "important");
              child.style.setProperty("align-items", cs.alignItems, "important");
              child.style.setProperty("justify-content", cs.justifyContent, "important");
              child.style.setProperty("flex-wrap", cs.flexWrap, "important");
              child.style.setProperty("gap", cs.gap, "important");
            }

            // Fix badge/pill vertical alignment — spans with rounded-full lose centering in html2canvas
            if (
              child.tagName === "SPAN" &&
              (child.classList.contains("rounded-full") || child.classList.contains("rounded-lg"))
            ) {
              child.style.setProperty("display", "inline-block", "important");
              child.style.setProperty("line-height", "1.6", "important");
              child.style.setProperty("vertical-align", "middle", "important");
              child.style.setProperty("text-align", "center", "important");
            }

            // Ensure text nodes in flex children have explicit line-height
            if (cs.display === "flex" || cs.display === "inline-flex") {
              Array.from(child.children).forEach((fc) => {
                const fce = fc as HTMLElement;
                const fcs = doc.defaultView?.getComputedStyle(fce);
                if (fcs && fcs.lineHeight === "normal") {
                  fce.style.setProperty("line-height", "1.4", "important");
                }
              });
            }
          });

          el.querySelectorAll<HTMLElement>("button, [role='button'], .no-print").forEach(n => { n.style.display = "none"; });
        },
      } as any);

      const PAGE_W_PT = 595.28;
      const ratio = PAGE_W_PT / canvas.width;
      const PAGE_H_PT = Math.ceil(canvas.height * ratio);

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [PAGE_W_PT, PAGE_H_PT] });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, PAGE_W_PT, PAGE_H_PT);

      const name = (investorName || "Portfolio").replace(/\s+/g, "_");
      const dateStr = format(new Date(), "dd-MMM-yyyy");
      pdf.save(`ConciseReport_${name}_${dateStr}.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadExcel = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx-js-style") as any;
      const wb = XLSX.utils.book_new();
      const name = (investorName || "Portfolio").replace(/\s+/g, "_");
      const dateStr = format(new Date(), "dd-MMM-yyyy");

      // ── Design System ─────────────────────────────────────────────────
      const C = {
        NAVY:      "1E3A5F",
        BLUE:      "1E40AF",
        MIDBLUE:   "2563EB",
        LTBLUE:    "DBEAFE",
        ALTROW:    "EFF6FF",
        WHITE:     "FFFFFF",
        OFFWHITE:  "F8FAFC",
        SLATE:     "64748B",
        SLATEL:    "F1F5F9",
        GREEN:     "065F46",
        GREENL:    "D1FAE5",
        RED:       "991B1B",
        REDL:      "FEE2E2",
        AMBER:     "92400E",
        AMBERL:    "FEF3C7",
        BORDER:    "CBD5E1",
        TOTALBG:   "0F2442",
      };

      const border = {
        top:    { style: "thin", color: { rgb: C.BORDER } },
        bottom: { style: "thin", color: { rgb: C.BORDER } },
        left:   { style: "thin", color: { rgb: C.BORDER } },
        right:  { style: "thin", color: { rgb: C.BORDER } },
      };
      const borderMed = {
        top:    { style: "medium", color: { rgb: C.NAVY } },
        bottom: { style: "medium", color: { rgb: C.NAVY } },
        left:   { style: "medium", color: { rgb: C.NAVY } },
        right:  { style: "medium", color: { rgb: C.NAVY } },
      };

      // Cell factories
      const title = (v: string) => ({ v, t: "s", s: {
        font: { bold: true, sz: 14, color: { rgb: C.WHITE }, name: "Calibri" },
        fill: { fgColor: { rgb: C.NAVY } },
        alignment: { horizontal: "left", vertical: "center", wrapText: true },
        border: borderMed,
      }});

      const sec = (v: string) => ({ v, t: "s", s: {
        font: { bold: true, sz: 10, color: { rgb: C.WHITE }, name: "Calibri" },
        fill: { fgColor: { rgb: C.MIDBLUE } },
        alignment: { horizontal: "left", vertical: "center" },
        border,
      }});

      const hdr = (v: string) => ({ v, t: "s", s: {
        font: { bold: true, sz: 9, color: { rgb: C.WHITE }, name: "Calibri" },
        fill: { fgColor: { rgb: C.BLUE } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border,
      }});

      const lbl = (v: string) => ({ v, t: "s", s: {
        font: { bold: true, sz: 10, color: { rgb: C.NAVY }, name: "Calibri" },
        fill: { fgColor: { rgb: C.SLATEL } },
        alignment: { horizontal: "left", vertical: "center" },
        border,
      }});

      const meta = (v: string) => ({ v, t: "s", s: {
        font: { sz: 10, color: { rgb: C.SLATE }, name: "Calibri" },
        fill: { fgColor: { rgb: C.SLATEL } },
        alignment: { horizontal: "left", vertical: "center" },
        border,
      }});

      const txt = (v: string, row = 0, wrap = false) => ({ v: v ?? "—", t: "s", s: {
        font: { sz: 9, color: { rgb: "1E293B" }, name: "Calibri" },
        fill: { fgColor: { rgb: row % 2 === 0 ? C.WHITE : C.ALTROW } },
        alignment: { horizontal: "left", vertical: "center", wrapText: wrap },
        border,
      }});

      const num = (v: number, fmt: string, row = 0, color?: string) => ({ v: isNaN(v) ? 0 : v, t: "n", z: fmt, s: {
        font: { sz: 9, color: { rgb: color ?? "1E293B" }, name: "Calibri" },
        fill: { fgColor: { rgb: row % 2 === 0 ? C.WHITE : C.ALTROW } },
        alignment: { horizontal: "right", vertical: "center" },
        border,
        numFmt: fmt,
      }});

      const pctCell = (v: number, row = 0) => {
        const color = v > 0.5 ? C.GREEN : v < -0.5 ? C.RED : "1E293B";
        return num(v, "0.00", row, color);
      };

      const tot = (v: string | number, fmt?: string) => ({
        v, t: typeof v === "number" ? "n" : "s",
        ...(fmt ? { z: fmt } : {}),
        s: {
          font: { bold: true, sz: 10, color: { rgb: C.WHITE }, name: "Calibri" },
          fill: { fgColor: { rgb: C.TOTALBG } },
          alignment: { horizontal: typeof v === "number" ? "right" : "center", vertical: "center" },
          border: borderMed,
        }
      });

      const plCell = (v: number, row = 0) => {
        const color = v >= 0 ? C.GREEN : C.RED;
        const bg = v >= 0 ? (row % 2 === 0 ? C.WHITE : C.ALTROW) : (row % 2 === 0 ? C.WHITE : C.ALTROW);
        return { v, t: "n", z: '#,##0.00', s: {
          font: { sz: 9, bold: false, color: { rgb: color }, name: "Calibri" },
          fill: { fgColor: { rgb: bg } },
          alignment: { horizontal: "right", vertical: "center" },
          border,
        }};
      };

      const empty = () => ({ v: "", t: "s", s: {
        fill: { fgColor: { rgb: C.WHITE } },
        border,
      }});

      // Utility: set column widths
      const setColWidths = (ws: any, widths: number[]) => {
        ws["!cols"] = widths.map(w => ({ wch: w }));
      };

      // Utility: set row heights
      const setRowHeights = (ws: any, heights: Record<number, number>) => {
        ws["!rows"] = ws["!rows"] || [];
        Object.entries(heights).forEach(([r, h]) => {
          ws["!rows"][parseInt(r)] = { hpt: h };
        });
      };

      const snap = mfSnapshot;
      const accounts: any[] = analysis.account_summaries || [];
      const totalVal = snap.reduce((a: number, m: any) => a + (m.valuation || 0), 0);
      const absReturn = totalValuation - totalInvested;
      const absReturnPct = totalInvested > 0 ? (absReturn / totalInvested) * 100 : 0;
      const approxCagr = totalInvested > 0 ? (Math.pow(totalValuation / totalInvested, 1 / 2) - 1) * 100 : 0;

      // ── Sheet 1: Portfolio Overview + Asset Allocation + Category Distribution ──
      const ov: any[][] = [
        [title("Portfolio Report – " + (investorName || "Portfolio")), empty(), empty(), empty()],
        [lbl("Analyzed on"), meta(report.createdAt ? format(new Date(report.createdAt), "MMMM d, yyyy") : ""), empty(), empty()],
        [lbl("Investor Type"), meta(report.investorType || "—"), lbl("Age Group"), meta(report.ageGroup || "—")],
        [empty(), empty(), empty(), empty()],
        [sec("PORTFOLIO SUMMARY"), empty(), empty(), empty()],
        [lbl("Total Portfolio Value"), num(totalValuation, '"₹"#,##0.00'), empty(), empty()],
        [lbl("Total Invested"), num(totalInvested, '"₹"#,##0.00'), empty(), empty()],
        [lbl("Absolute Gain / Loss"), plCell(absReturn), empty(), empty()],
        [lbl("Overall Return (%)"), pctCell(absReturnPct), empty(), empty()],
        [lbl("Approx 2-Yr CAGR (%)"), pctCell(approxCagr), empty(), empty()],
        [lbl("Total Schemes"), num(snap.length, "0"), empty(), empty()],
        [lbl("Total Accounts"), num(accounts.length, "0"), empty(), empty()],
        [empty(), empty(), empty(), empty()],
        [sec("ACCOUNT BREAKDOWN"), empty(), empty(), empty()],
        [hdr("Account Type"), hdr("Schemes / Count"), hdr("Value (₹)"), hdr("% of Total")],
        ...accounts.map((a: any, i: number) => {
          const pct = totalValuation > 0 ? (a.value / totalValuation) * 100 : 0;
          return [txt(a.type, i), num(a.count, "0", i), num(a.value, '"₹"#,##0.00', i), pctCell(pct, i)];
        }),
      ];
      
      // Asset Allocation section - start row after portfolio overview
      const allCats = ["Equity", "Debt", "Hybrid", "Gold/Silver", "Others"];
      const parseIdealPct = (v: string) => parseFloat(v?.replace("%", "") || "0");
      const idealMap2 = IDEAL_ALLOCATIONS[report.ageGroup || ""]?.[report.investorType || ""] || {};
      const actMap2: Record<string, number> = {};
      snap.forEach((mf: any) => {
        const cat = (mf.fund_category || "").toLowerCase();
        const pct = totalVal > 0 ? (mf.valuation / totalVal) * 100 : 0;
        if (cat.includes("equity")) actMap2["Equity"] = (actMap2["Equity"] || 0) + pct;
        else if (cat.includes("debt")) actMap2["Debt"] = (actMap2["Debt"] || 0) + pct;
        else if (cat.includes("hybrid")) actMap2["Hybrid"] = (actMap2["Hybrid"] || 0) + pct;
        else if (cat.includes("gold") || cat.includes("silver")) actMap2["Gold/Silver"] = (actMap2["Gold/Silver"] || 0) + pct;
        else actMap2["Others"] = (actMap2["Others"] || 0) + pct;
      });
      let healthScore2 = 100;
      allCats.forEach((c: string) => { healthScore2 -= Math.abs((actMap2[c] || 0) - (parseIdealPct(idealMap2[c] || "0"))) * 0.8; });
      healthScore2 = Math.max(0, Math.min(100, Math.round(healthScore2)));

      const statusCell = (status: string, row: number) => {
        const bg = status === "On target" ? C.GREENL : status === "Over" ? C.AMBERL : C.REDL;
        const fg = status === "On target" ? C.GREEN : status === "Over" ? C.AMBER : C.RED;
        return { v: status, t: "s", s: {
          font: { bold: true, sz: 9, color: { rgb: fg }, name: "Calibri" },
          fill: { fgColor: { rgb: bg } },
          alignment: { horizontal: "center", vertical: "center" },
          border,
        }};
      };

      const alData: any[][] = [
        [empty(), empty(), empty(), empty(), empty()],
        [title("Asset Allocation Check"), empty(), empty(), empty(), empty()],
        [lbl("Investor Type"), meta(report.investorType || "—"), empty(), lbl("Age Group"), meta(report.ageGroup || "—")],
        [lbl("Health Score"), { v: healthScore2 + " / 100", t: "s", s: { font: { bold: true, sz: 12, color: { rgb: healthScore2 >= 70 ? C.GREEN : healthScore2 >= 50 ? C.AMBER : C.RED }, name: "Calibri" }, fill: { fgColor: { rgb: C.SLATEL } }, alignment: { horizontal: "left" }, border } }, empty(), empty(), empty()],
        [empty(), empty(), empty(), empty(), empty()],
        [hdr("Category"), hdr("Actual (%)"), hdr("Ideal (%)"), hdr("Difference (%)"), hdr("Status")],
        ...allCats.map((cat, i) => {
          const actual = actMap2[cat] || 0;
          const ideal = parseIdealPct(idealMap2[cat] || "0");
          const diff = actual - ideal;
          const status = Math.abs(diff) < 1 ? "On target" : diff > 0 ? "Over" : "Under";
          return [txt(cat, i), pctCell(actual, i), pctCell(ideal, i), pctCell(diff, i), statusCell(status, i)];
        }),
      ];
      
      // Category Distribution section
      const typeMap2: Record<string, Record<string, number>> = {};
      snap.forEach((mf: any) => {
        const cat = (mf.fund_category || "").toLowerCase();
        const type = mf.fund_type || "Other";
        const pct = totalVal > 0 ? (mf.valuation / totalVal) * 100 : 0;
        let mainCat = "Others";
        if (cat.includes("equity")) mainCat = "Equity";
        else if (cat.includes("debt")) mainCat = "Debt";
        else if (cat.includes("hybrid")) mainCat = "Hybrid";
        else if (cat.includes("gold") || cat.includes("silver")) mainCat = "Gold/Silver";
        if (!typeMap2[mainCat]) typeMap2[mainCat] = {};
        typeMap2[mainCat][type] = (typeMap2[mainCat][type] || 0) + pct;
      });
      const distData = allCats.flatMap(cat => {
        const subs = Object.entries(typeMap2[cat] || {}).sort((a, b) => b[1] - a[1]);
        if (subs.length === 0) return [[cat, "—", 0]];
        return subs.map(([type, pct], i) => [i === 0 ? cat : "", type, pct]);
      });
      
      const distData2: any[][] = [
        [empty(), empty(), empty()],
        [title("Category Wise Distribution"), empty(), empty()],
        [empty(), empty(), empty()],
        [hdr("Main Category"), hdr("Sub-Category / Type"), hdr("Allocation (%)")],
        ...distData.map(([cat, type, pct], i) => [
          cat ? txt(String(cat), i) : empty(),
          txt(String(type), i),
          pctCell(Number(pct), i),
        ]),
      ];
      
      // Combine all three sections into one sheet
      const combinedData = [...ov, ...alData, ...distData2];
      const ws1 = XLSX.utils.aoa_to_sheet(combinedData);
      setColWidths(ws1, [32, 22, 18, 14]);
      setRowHeights(ws1, { 0: 28, 4: 22, 13: 22 });
      ws1["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } },
        { s: { r: 13, c: 0 }, e: { r: 13, c: 3 } },
        ...([5,6,7,8,9,10,11].map(r => ({ s: { r, c: 2 }, e: { r, c: 3 } }))),
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "Portfolio Overview");

      // ── Sheet 2: Performance Check + Portfolio Snapshot ────────────────
      const pv = (v: string) => parseFloat(v?.replace(/[^\d.-]/g, "") || "0");
      const perfFunds = snap.filter((mf: any) => storedPerformances[mf.isin]);
      const perfHdrs = ["#", "Fund Name", "ISIN", "Category", "Risk Type", "SIP Amt (₹)",
        "1Y CAGR%", "BM 1Y%", "3Y CAGR%", "BM 3Y%", "5Y CAGR%", "BM 5Y%",
        "Fin Score", "Perf Score", "Total /80", "Rating", "Action", "Target Category", "Target Fund", "Remarks"];
      const cagrColor = (val: number, bm: number) => isNaN(val) ? "1E293B" : val >= bm ? C.GREEN : C.RED;

      const perf: any[][] = [
        [title("Concise Performance Check"), ...Array(perfHdrs.length - 1).fill(empty())],
        [empty(), ...Array(perfHdrs.length - 1).fill(empty())],
        perfHdrs.map(h => hdr(h)),
        ...perfFunds.map((mf: any, i: number) => {
          const p = storedPerformances[mf.isin];
          const sc = storedScoring[mf.isin];
          const cagr = p?.cagr || {};
          const bm = p?.benchmark_returns || {};
          const diff1 = pv(cagr["1y"]) - pv(bm["1y"]);
          const diff3 = pv(cagr["3y"]) - pv(bm["3y"]);
          const diff5 = pv(cagr["5y"]) - pv(bm["5y"]);
          const s1 = diff1 >= 3 ? 10 : diff1 >= 1.5 ? 8 : diff1 >= 0 ? 6 : diff1 >= -1.49 ? 4 : diff1 >= -2.99 ? 2 : 0;
          const s3 = diff3 >= 3 ? 15 : diff3 >= 1.5 ? 13 : diff3 >= 0 ? 11 : diff3 >= -1.49 ? 9 : diff3 >= -2.99 ? 7 : 0;
          const s5 = diff5 >= 3 ? 15 : diff5 >= 1.5 ? 13 : diff5 >= 0 ? 11 : diff5 >= -1.49 ? 9 : diff5 >= -2.99 ? 7 : 0;
          const perfScore = s1 + s3 + s5;
          const finScore = sc?.totalScore ?? 0;
          const total = finScore + perfScore;
          const pctXl = Math.round((total / 80) * 100);
          const isIdx = /\betf\b|\bindex\b/i.test(mf.scheme_name || "") || /\bindex\b|\betf\b/i.test(sc?.category || "");
          const ratingRaw = pctXl >= 80 ? "Excellent" : pctXl >= 60 ? "Good" : pctXl >= 45 ? "Average" : "Poor";
          const rating = isIdx && ratingRaw === "Poor" ? "Average" : ratingRaw;
          const action = (actionSelections[mf.scheme_name] || "hold").toUpperCase();
          const sip = sipAmounts[mf.scheme_name];
          const c1 = pv(cagr["1y"]), c3 = pv(cagr["3y"]), c5 = pv(cagr["5y"]);
          const b1 = pv(bm["1y"]), b3 = pv(bm["3y"]), b5 = pv(bm["5y"]);

          const ratingStyle = (r: string) => {
            const map: Record<string, [string, string]> = {
              "Excellent": [C.GREEN, C.GREENL], "Good": [C.BLUE, C.LTBLUE],
              "Average": [C.AMBER, C.AMBERL], "Poor": [C.RED, C.REDL],
            };
            const [fg, bg] = map[r] || [C.SLATE, C.SLATEL];
            return { v: r, t: "s", s: { font: { bold: true, sz: 9, color: { rgb: fg }, name: "Calibri" }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: "center" }, border } };
          };

          const cagrCell = (val: number, bmVal: number, row: number) => ({
            v: isNaN(val) ? "N/A" : val,
            t: isNaN(val) ? "s" : "n",
            z: isNaN(val) ? undefined : "0.00",
            s: {
              font: { bold: !isNaN(val), sz: 9, color: { rgb: isNaN(val) ? C.SLATE : cagrColor(val, bmVal) }, name: "Calibri" },
              fill: { fgColor: { rgb: row % 2 === 0 ? C.WHITE : C.ALTROW } },
              alignment: { horizontal: "right" },
              border,
            }
          });

          const actionStyle = (a: string) => {
            const map: Record<string, [string, string]> = {
              "HOLD": [C.BLUE, C.LTBLUE], "SWITCH": [C.AMBER, C.AMBERL],
              "MERGE": ["4C1D95", "EDE9FE"], "SELL": [C.RED, C.REDL],
            };
            const [fg, bg] = map[a] || [C.SLATE, C.SLATEL];
            return { v: a, t: "s", s: { font: { bold: true, sz: 9, color: { rgb: fg }, name: "Calibri" }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: "center" }, border } };
          };

          return [
            num(i + 1, "0", i),
            txt(mf.scheme_name || "—", i, true),
            txt(mf.isin || "—", i),
            txt(mf.fund_category || "—", i),
            txt(mf.fund_type || "—", i),
            sip != null ? num(sip, '"₹"#,##0', i) : txt("—", i),
            cagrCell(c1, b1, i),
            cagrCell(b1, b1, i),
            cagrCell(c3, b3, i),
            cagrCell(b3, b3, i),
            cagrCell(c5, b5, i),
            cagrCell(b5, b5, i),
            num(finScore, "0", i),
            num(perfScore, "0", i),
            num(total, "0", i),
            ratingStyle(rating),
            actionStyle(action),
            txt(targetCategory[mf.scheme_name] || "—", i),
            txt(targetFund[mf.scheme_name] || "—", i, true),
            txt(remarks[mf.scheme_name] || "—", i, true),
          ];
        }),
      ];
      
      // Portfolio Snapshot section
      const snapHdrs = ["#", "Scheme Name", "Category", "Fund Type", "Units", "NAV (₹)", "Invested (₹)", "Value (₹)", "P/L (₹)"];
      const snData: any[][] = [
        [empty(), ...Array(snapHdrs.length - 1).fill(empty())],
        [title("Portfolio Snapshot – Mutual Fund Units"), ...Array(snapHdrs.length - 1).fill(empty())],
        [empty(), ...Array(snapHdrs.length - 1).fill(empty())],
        snapHdrs.map(h => hdr(h)),
        ...snap.map((mf: any, i: number) => [
          num(i + 1, "0", i),
          txt(mf.scheme_name || "—", i, true),
          txt(mf.fund_category || "—", i),
          txt(mf.fund_type || "—", i),
          num(mf.units ?? mf.closing_balance ?? 0, "0.0000", i),
          num(mf.nav || 0, '"₹"#,##0.0000', i),
          num(mf.invested_amount ?? 0, '"₹"#,##0.00', i),
          num(mf.valuation || 0, '"₹"#,##0.00', i),
          plCell(mf.unrealised_profit_loss || 0, i),
        ]),
        [tot("GRAND TOTAL"), tot(""), tot(""), tot(""), tot(""), tot(""),
          tot(totalInvested, '"₹"#,##0.00'),
          tot(totalValuation, '"₹"#,##0.00'),
          { ...tot(totalUnrealised, '"₹"#,##0.00'), s: { ...tot("").s, font: { bold: true, sz: 10, color: { rgb: totalUnrealised >= 0 ? "6EE7B7" : "FCA5A5" }, name: "Calibri" }, fill: { fgColor: { rgb: C.TOTALBG } }, alignment: { horizontal: "right" }, border: borderMed } },
        ],
      ];
      
      // Combine Performance Check and Portfolio Snapshot
      const combinedPerfSnap = [...perf, ...snData];
      const ws2 = XLSX.utils.aoa_to_sheet(combinedPerfSnap);
      setColWidths(ws2, [4, 38, 14, 16, 14, 12, 9, 9, 9, 9, 9, 9, 10, 10, 10, 12, 10, 18, 38, 28]);
      setRowHeights(ws2, { 0: 28, 2: 32 });
      ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: perfHdrs.length - 1 } }];
      XLSX.utils.book_append_sheet(wb, ws2, "Performance Check");

      // ── Sheet 3: New Allocation ────────────────────────────────────────
      const naHdrs = ["Category", "Sub-Category", "Allocation (%)", "New Category", "New Sub-Category", "Fund Name", "Action"];
      const naRows: any[][] = [];
      let rowIdx = 0;
      
      // Build allocation data by category -> subcategory -> funds
      const catSubtypeMap: Record<string, Record<string, any[]>> = {};
      snap.forEach((mf: any) => {
        const cat = (mf.fund_category || "").toLowerCase();
        let mainCat = "Others";
        if (cat.includes("equity")) mainCat = "Equity";
        else if (cat.includes("debt")) mainCat = "Debt";
        else if (cat.includes("hybrid")) mainCat = "Hybrid";
        else if (cat.includes("gold") || cat.includes("silver")) mainCat = "Gold/Silver";
        
        if (!catSubtypeMap[mainCat]) catSubtypeMap[mainCat] = {};
        const subtype = mf.fund_type || "Other";
        if (!catSubtypeMap[mainCat][subtype]) catSubtypeMap[mainCat][subtype] = [];
        catSubtypeMap[mainCat][subtype].push(mf);
      });
      
      // Generate rows grouped by category and subcategory
      allCats.forEach((mainCat: string) => {
        const subtypes = catSubtypeMap[mainCat] || {};
        const subtypeEntries = Object.entries(subtypes);
        
        if (subtypeEntries.length === 0) return;
        
        subtypeEntries.forEach(([subtype, funds], stIdx) => {
          const catAlloc = actMap2[mainCat] || 0;
          const subtypeTotal = funds.reduce((s: number, f: any) => s + (f.valuation || 0), 0);
          const subtypeAlloc = totalVal > 0 ? (subtypeTotal / totalVal) * 100 : 0;
          
          funds.forEach((mf: any, fIdx: number) => {
            const act = (actionSelections[mf.scheme_name] || "hold").toUpperCase();
            let actionLabel = "Existing Fund";
            let displayFund = mf.scheme_name || "—";
            let displaySubCat = "";
            
            if (act === "SWITCH" || act === "MERGE" || act === "SELL") {
              actionLabel = "New Fund";
              displayFund = targetFund[mf.scheme_name] || mf.scheme_name || "—";
              displaySubCat = targetSubCategory[mf.scheme_name] || "";
            }
            
            const actionStyle = (label: string) => {
              const isNewFund = label === "New Fund";
              const fg = isNewFund ? C.AMBER : C.BLUE;
              const bg = isNewFund ? C.AMBERL : C.LTBLUE;
              return { v: label, t: "s", s: { font: { bold: true, sz: 9, color: { rgb: fg }, name: "Calibri" }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: "center" }, border } };
            };
            
            const newCat = (act === "SWITCH" || act === "MERGE" || act === "SELL") ? targetCategory[mf.scheme_name] || "—" : "—";
            naRows.push([
              fIdx === 0 && stIdx === 0 ? txt(mainCat, rowIdx) : empty(),
              fIdx === 0 ? txt(subtype, rowIdx) : empty(),
              fIdx === 0 ? pctCell(subtypeAlloc, rowIdx) : empty(),
              txt(newCat, rowIdx),
              txt(displaySubCat || "—", rowIdx),
              txt(displayFund, rowIdx, true),
              actionStyle(actionLabel),
            ]);
            rowIdx++;
          });
        });
      });
      
      // Recommended Funds section
      const recFundsStart = rowIdx + 3;
      const recRows: any[][] = [
        [empty()],
        [sec("RECOMMENDED FUNDS"), empty(), empty(), empty(), empty()],
        [hdr("Category"), hdr("Sub Category"), hdr("Fund Name"), empty(), empty()],
      ];
      
      if (recommendedFunds.length === 0) {
        // If no recommended funds, show N/A
        recRows.push([
          txt("N/A", 0),
          empty(),
          empty(),
          empty(),
          empty(),
        ]);
        // Add blank row for spacing
        recRows.push([empty(), empty(), empty(), empty(), empty()]);
      } else {
        recommendedFunds.forEach((rec, idx) => {
          recRows.push([
            txt(rec.category || "—", idx),
            txt(rec.subCategory || "—", idx),
            txt(rec.fund || "—", idx, true),
            empty(),
            empty(),
          ]);
        });
      }
      
      // Calculate OLD allocation from original mfSnapshot
      const oldAllocMap: Record<string, Record<string, number>> = {};
      mfSnapshot.forEach((mf: any) => {
        const cat = (mf.fund_category || "").toLowerCase();
        const allocCat = cat.includes("equity") ? "Equity" : cat.includes("debt") ? "Debt" : cat.includes("hybrid") ? "Hybrid" : "Others";
        const allocSubCat = mf.fund_type || "Other";
        const valuation = mf.valuation || 0;
        
        if (!oldAllocMap[allocCat]) oldAllocMap[allocCat] = {};
        oldAllocMap[allocCat][allocSubCat] = (oldAllocMap[allocCat][allocSubCat] || 0) + valuation;
      });
      
      // Calculate NEW allocation based on actions
      const newAllocMap: Record<string, Record<string, number>> = {};
      
      mfSnapshot.forEach((mf: any) => {
        const action = (actionSelections[mf.scheme_name] || "hold").toLowerCase();
        const valuation = mf.valuation || 0;
        
        let allocCat = "";
        let allocSubCat = "";
        
        if (action === "hold") {
          // Use original category and type
          const cat = (mf.fund_category || "").toLowerCase();
          allocCat = cat.includes("equity") ? "Equity" : cat.includes("debt") ? "Debt" : cat.includes("hybrid") ? "Hybrid" : "Others";
          allocSubCat = mf.fund_type || "Other";
        } else if (action === "switch" || action === "merge" || action === "sell") {
          // Use NEW category and sub-category
          allocCat = targetCategory[mf.scheme_name] || "";
          allocSubCat = targetSubCategory[mf.scheme_name] || "";
          
          // If category is selected but subcategory is not, try to get it from the selected fund
          if (allocCat && !allocSubCat && schemeData && schemeData.length > 0) {
            const selectedFundName = targetFund[mf.scheme_name] || "";
            if (selectedFundName) {
              const fundData = schemeData.find(s => s.schemeName === selectedFundName && s.category === allocCat);
              if (fundData) {
                allocSubCat = fundData.subCategory;
              }
            }
          }
          
          // If category is not selected, skip this fund (no action taken)
          if (!allocCat) {
            allocCat = "";
            allocSubCat = "";
          }
        }
        
        // Only add if both category and subcategory are properly set
        if (allocCat && allocSubCat && allocCat !== "—" && allocSubCat !== "—") {
          if (!newAllocMap[allocCat]) newAllocMap[allocCat] = {};
          newAllocMap[allocCat][allocSubCat] = (newAllocMap[allocCat][allocSubCat] || 0) + valuation;
        }
      });
      
      // Add recommended funds to the new allocation map
      recommendedFunds.forEach((rec) => {
        if (rec.category && rec.subCategory) {
          // Normalize category (remove "Scheme" suffix if present)
          const normalizedCat = rec.category.replace(/\s+Scheme$/i, "").trim();
          if (!newAllocMap[normalizedCat]) newAllocMap[normalizedCat] = {};
          // For recommended funds, add a nominal value (0.01) to show they exist
          newAllocMap[normalizedCat][rec.subCategory] = (newAllocMap[normalizedCat][rec.subCategory] || 0) + 0.01;
        }
      });
      
      // Normalize category names in both maps (remove "Scheme" suffix)
      const normalizeCategory = (cat: string) => cat.replace(/\s+Scheme$/i, "").trim();
      
      // Create normalized versions of both maps
      const normalizedOldMap: Record<string, Record<string, number>> = {};
      Object.keys(oldAllocMap).forEach(cat => {
        const normCat = normalizeCategory(cat);
        if (!normalizedOldMap[normCat]) normalizedOldMap[normCat] = {};
        Object.keys(oldAllocMap[cat]).forEach(subcat => {
          normalizedOldMap[normCat][subcat] = (normalizedOldMap[normCat][subcat] || 0) + oldAllocMap[cat][subcat];
        });
      });
      
      const normalizedNewMap: Record<string, Record<string, number>> = {};
      Object.keys(newAllocMap).forEach(cat => {
        const normCat = normalizeCategory(cat);
        if (!normalizedNewMap[normCat]) normalizedNewMap[normCat] = {};
        Object.keys(newAllocMap[cat]).forEach(subcat => {
          normalizedNewMap[normCat][subcat] = (normalizedNewMap[normCat][subcat] || 0) + newAllocMap[cat][subcat];
        });
      });
      
      // Build Updated allocation summary rows (4 columns: Category, Sub-Category, Old %, New %)
      const allocSummaryRows: any[][] = [
        [sec("Updated allocation"), empty(), empty(), empty()],
        [hdr("Category"), hdr("Sub-Category"), hdr("Old Allocation (%)"), hdr("New Allocation (%)")],
      ];
      
      // Collect all unique category+subcategory combinations from both normalized maps
      const allCombos = new Set<string>();
      Object.keys(normalizedOldMap).forEach(cat => {
        Object.keys(normalizedOldMap[cat]).forEach(subcat => {
          allCombos.add(`${cat}|${subcat}`);
        });
      });
      Object.keys(normalizedNewMap).forEach(cat => {
        Object.keys(normalizedNewMap[cat]).forEach(subcat => {
          allCombos.add(`${cat}|${subcat}`);
        });
      });
      
      // Sort combos by category order
      const catOrder = ["Equity", "Debt", "Hybrid", "Gold/Silver", "Others"];
      const sortedCombos = Array.from(allCombos).sort((a, b) => {
        const [catA, subcatA] = a.split("|");
        const [catB, subcatB] = b.split("|");
        const catOrder2 = catOrder.indexOf(catA) - catOrder.indexOf(catB);
        return catOrder2 !== 0 ? catOrder2 : subcatA.localeCompare(subcatB);
      });
      
      // Build rows using normalized maps
      let lastCat = "";
      sortedCombos.forEach((combo) => {
        const [cat, subcat] = combo.split("|");
        const oldVal = normalizedOldMap[cat]?.[subcat] || 0;
        const newVal = normalizedNewMap[cat]?.[subcat] || 0;
        const oldPct = totalVal > 0 ? (oldVal / totalVal) * 100 : 0;
        const newPct = totalVal > 0 ? (newVal / totalVal) * 100 : 0;
        
        allocSummaryRows.push([
          cat !== lastCat ? txt(cat, allocSummaryRows.length % 2) : empty(),
          txt(subcat, allocSummaryRows.length % 2),
          pctCell(oldPct, allocSummaryRows.length % 2),
          pctCell(newPct, allocSummaryRows.length % 2),
        ]);
        lastCat = cat;
      });
      
      const na: any[][] = [
        [title("New Allocation Sheet – Updated Allocation & Actions"), ...Array(naHdrs.length - 1).fill(empty())],
        [lbl("Generated on"), meta(dateStr), ...Array(naHdrs.length - 2).fill(empty())],
        [empty(), ...Array(naHdrs.length - 1).fill(empty())],
        naHdrs.map(h => hdr(h)),
        ...naRows,
        ...recRows,
        ...allocSummaryRows,
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(na);
      setColWidths(ws3, [14, 16, 14, 14, 18, 40, 14]);
      setRowHeights(ws3, { 0: 28, 3: 28, [allocSummaryRows[0][0]?.rowIdx || 0]: 24 });
      ws3["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: naHdrs.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: naHdrs.length - 1 } },
      ];
      XLSX.utils.book_append_sheet(wb, ws3, "New Allocation");

      // ── Sheet 5: Monthly Portfolio Value Trend ──────────────────────────
      const monthlyData = (analysis.monthly_portfolio_trend || []).map((m: any) => [
        txt(m.month || "—", 0),
        num(m.portfolio_value ?? 0, '"₹"#,##0.00', 0),
        m.change_value ? num(m.change_value, '"₹"#,##0.00', 0) : txt("—", 0),
        m.change_percent ? num(m.change_percent, "0.00%", 0) : txt("—", 0),
      ]);
      const mtHdrs = ["Month", "Portfolio Value (₹)", "Change (₹)", "Change (%)"];
      const mt: any[][] = [
        [title("Monthly Portfolio Value Trend"), ...Array(mtHdrs.length - 1).fill(empty())],
        [empty(), ...Array(mtHdrs.length - 1).fill(empty())],
        mtHdrs.map(h => hdr(h)),
        ...monthlyData,
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(mt);
      setColWidths(ws5, [16, 18, 16, 14]);
      setRowHeights(ws5, { 0: 28, 2: 24 });
      ws5["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: mtHdrs.length - 1 } }];
      XLSX.utils.book_append_sheet(wb, ws5, "Monthly Trend");

      XLSX.writeFile(wb, `ConciseReport_${name}_${dateStr}.xlsx`);
    } catch (err) {
      console.error("Excel export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  // ── Hooks that MUST be above all early returns ──────────────────────────
  const healthScore = useMemo(() => {
    if (!report) return 0;
    const totalV = mfSnapshot.reduce((a: number, m: any) => a + (m.valuation || 0), 0);
    const aMap: Record<string, number> = {};
    mfSnapshot.forEach((mf: any) => {
      const cat = (mf.fund_category || "").toLowerCase();
      const pct = totalV > 0 ? (mf.valuation / totalV) * 100 : 0;
      let mainCat = "Others";
      if (cat.includes("equity")) mainCat = "Equity";
      else if (cat.includes("debt")) mainCat = "Debt";
      else if (cat.includes("hybrid")) mainCat = "Hybrid";
      else if (cat.includes("gold") || cat.includes("silver")) mainCat = "Gold/Silver";
      aMap[mainCat] = (aMap[mainCat] || 0) + pct;
    });
    const ideal = IDEAL_ALLOCATIONS[report.ageGroup || ""]?.[report.investorType || ""] || {};
    let score = 100;
    ["Equity","Debt","Hybrid","Gold/Silver","Others"].forEach(cat => {
      const idealPct = parseFloat((ideal[cat] || "0").replace("%",""));
      score -= Math.abs((aMap[cat] || 0) - idealPct) * 0.9;
    });
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [report, mfSnapshot]);

  const rebalancingPlan = useMemo(() => {
    if (!report) return [];
    const totalV = mfSnapshot.reduce((a: number, m: any) => a + (m.valuation || 0), 0);
    const aMap: Record<string, number> = {};
    mfSnapshot.forEach((mf: any) => {
      const cat = (mf.fund_category || "").toLowerCase();
      const pct = totalV > 0 ? (mf.valuation / totalV) * 100 : 0;
      let mainCat = "Others";
      if (cat.includes("equity")) mainCat = "Equity";
      else if (cat.includes("debt")) mainCat = "Debt";
      else if (cat.includes("hybrid")) mainCat = "Hybrid";
      else if (cat.includes("gold") || cat.includes("silver")) mainCat = "Gold/Silver";
      aMap[mainCat] = (aMap[mainCat] || 0) + pct;
    });
    const CAT_COLORS: Record<string, string> = { Equity: "#3b82f6", Debt: "#f59e0b", Hybrid: "#94a3b8", "Gold/Silver": "#d97706", Others: "#10b981" };
    const ideal = IDEAL_ALLOCATIONS[report.ageGroup || ""]?.[report.investorType || ""] || {};
    return ["Equity","Debt","Hybrid","Gold/Silver","Others"].map(cat => {
      const idealPct = parseFloat((ideal[cat] || "0").replace("%",""));
      const actPct = aMap[cat] || 0;
      const diff = actPct - idealPct;
      return { category: cat, ideal: idealPct, actual: actPct, diff, over: diff > 0, color: CAT_COLORS[cat] || "#64748b" };
    }).filter(r => Math.abs(r.diff) >= 1);
  }, [report, mfSnapshot]);

  const sipHealthItems = useMemo(() => {
    return Object.entries(sipAmounts).map(([scheme, amount]) => {
      const mf = mfSnapshot.find((m: any) => m.scheme_name === scheme);
      const perf = mf ? storedPerformances[(mf as any).isin] : null;
      const pv = (v: string | undefined) => parseFloat((v || "0").replace(/[^\d.-]/g, "") || "0");
      const cagr = perf ? (perf as any).cagr?.["1y"] : null;
      const bm1y = perf ? pv((perf as any).benchmark_returns?.["1y"]) : 0;
      const cagr1y = perf ? pv((perf as any).cagr?.["1y"]) : 0;
      const healthy = perf ? cagr1y >= bm1y : false;
      return { name: scheme, amount, cagr, healthy };
    });
  }, [sipAmounts, mfSnapshot, storedPerformances]);

  const selectedFundData = useMemo(() => {
    if (!selectedFundIsin) return null;
    const fund = mfSnapshot.find((m: any) => m.isin === selectedFundIsin);
    if (!fund) return null;
    return { fund, perf: storedPerformances[selectedFundIsin], scoring: storedScoring[selectedFundIsin] };
  }, [selectedFundIsin, mfSnapshot, storedPerformances, storedScoring]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Report not found.
      </div>
    );
  }

  const formatLakh = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(2)} L` : `₹${v.toLocaleString()}`;
  const allCategories = ["Equity", "Debt", "Hybrid", "Gold/Silver", "Others"];
  const parseIdeal = (v: string) => parseFloat(v?.replace("%", "") || "0");
  const idealRaw = IDEAL_ALLOCATIONS[report.ageGroup || ""]?.[report.investorType || ""] || {};

  const actualMap: Record<string, number> = {};
  const typeMap: Record<string, Record<string, number>> = {};
  const totalVal = mfSnapshot.reduce((a: number, m: any) => a + (m.valuation || 0), 0);
  mfSnapshot.forEach((mf: any) => {
    const cat = (mf.fund_category || "").toLowerCase();
    const type = mf.fund_type || "Other";
    const pct = totalVal > 0 ? (mf.valuation / totalVal) * 100 : 0;
    let mainCat = "Others";
    if (cat.includes("equity")) mainCat = "Equity";
    else if (cat.includes("debt")) mainCat = "Debt";
    else if (cat.includes("hybrid")) mainCat = "Hybrid";
    else if (cat.includes("gold") || cat.includes("silver")) mainCat = "Gold/Silver";
    actualMap[mainCat] = (actualMap[mainCat] || 0) + pct;
    if (!typeMap[mainCat]) typeMap[mainCat] = {};
    typeMap[mainCat][type] = (typeMap[mainCat][type] || 0) + pct;
  });

  // Build repeat-count map for SIP detection: same scheme + same amount appearing 2+ times = recurring SIP
  const txRepeatMap: Record<string, number> = {};
  (analysis.transactions || []).forEach((tx: any) => {
    if (!tx.scheme_name || !tx.amount) return;
    const type = (tx.type || "").toUpperCase();
    if (type === "SIP" || type === "PURCHASE") {
      const key = `${tx.scheme_name}||${Math.round(tx.amount)}`;
      txRepeatMap[key] = (txRepeatMap[key] || 0) + 1;
    }
  });
  const categorize = (type: string, tx: any) => {
    const t = type.toLowerCase().trim();
    const key = `${tx.scheme_name}||${Math.round(tx.amount)}`;
    if (t === "sip" || (t === "purchase" && (txRepeatMap[key] || 0) >= 2)) return "SIP";
    if (t === "purchase") return null;
    if (t === "swp" || t.includes("systematic withdrawal")) return "SWP";
    if (["stp-out", "stp", "switch out", "systematic transfer"].some(k => t.includes(k)) || t === "stp-in") return "STP";
    return null;
  };
  const fundCategoryMap: Record<string, string> = {};
  (analysis.mf_snapshot || []).forEach((mf: any) => {
    if (mf.scheme_name) fundCategoryMap[mf.scheme_name] = (mf.fund_category || "").toLowerCase();
  });
  const txSections: Record<string, any[]> = {
    "STP (Systematic Transfer Plan)": [],
    "SIP (Systematic Investment Plan)": [],
    "SWP (Systematic Withdrawal Plan)": []
  };
  (analysis.transactions || []).forEach((tx: any) => {
    const rawType = (tx.type || "").toLowerCase().trim();
    const category = categorize(rawType, tx);
    if (category === "STP") {
      if (rawType === "stp-in") return;
      if (rawType === "stp") {
        const fundCat = fundCategoryMap[tx.scheme_name] || "";
        if (fundCat && fundCat !== "debt") return;
      }
      txSections["STP (Systematic Transfer Plan)"].push(tx);
    } else if (category === "SIP" && tx.scheme_name in sipAmounts) txSections["SIP (Systematic Investment Plan)"].push(tx);
    else if (category === "SWP") txSections["SWP (Systematic Withdrawal Plan)"].push(tx);
  });

  const getYearMonth = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      const monthMap: Record<string, string> = { jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12" };
      const year = parts[2].padStart(4, "0");
      const rawM = parts[1];
      const month = isNaN(parseInt(rawM)) ? (monthMap[rawM.toLowerCase().slice(0,3)] ?? "00") : String(parseInt(rawM)).padStart(2, "0");
      return `${year}-${month}`;
    }
    return "";
  };

  const sipItems = txSections["SIP (Systematic Investment Plan)"];
  const latestMonthByScheme: Record<string, string> = {};
  sipItems.forEach((tx: any) => {
    const key = tx.scheme_name || "unknown";
    const ym = getYearMonth(tx.date);
    if (!latestMonthByScheme[key] || ym > latestMonthByScheme[key]) latestMonthByScheme[key] = ym;
  });
  txSections["SIP (Systematic Investment Plan)"] = sipItems.filter((tx: any) => getYearMonth(tx.date) === latestMonthByScheme[tx.scheme_name || "unknown"]);
  const sipSectionSchemes = new Set(txSections["SIP (Systematic Investment Plan)"].map((tx: any) => tx.scheme_name));

  // (hooks moved above early returns — see above)

  return (
    <div className={`min-h-screen font-sans pb-20 relative ${darkMode ? "dark" : ""}`}>
      <AnimatedBackground />
      {/* Navbar */}
      <nav className="border-b" style={{ background: "rgba(10,14,46,0.6)", backdropFilter: "blur(16px)", borderColor: "rgba(96,165,250,0.15)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg" style={{ background: "linear-gradient(135deg,#3b6fff,#9333ea)", boxShadow: "0 0 16px rgba(59,111,255,0.5)" }}>
              <BarChart2 className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold font-display" style={{ background: "linear-gradient(90deg,#60a5fa,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              CasAnalyser
            </span>
          </div>
          <span className="hidden sm:block text-slate-400 text-sm font-medium">AI-Powered Portfolio Insights</span>
        </div>
      </nav>
      {isAutoAnalyzing && (
        <div className="sticky top-0 z-50 w-full px-4 py-2" style={{ background: "rgba(10,14,46,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(96,165,250,0.2)" }}>
          <div className="max-w-6xl mx-auto flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-blue-300 font-medium">Analysing risk metrics for all funds…</span>
                <span className="text-xs text-slate-400">{analyzeProgress.done}/{analyzeProgress.total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(96,165,250,0.15)" }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${analyzeProgress.total ? (analyzeProgress.done / analyzeProgress.total) * 100 : 0}%`, background: "linear-gradient(90deg,#3b6fff,#9333ea)" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Sticky Section Tab Bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-40 w-full" style={{ background: "rgba(7,10,18,0.93)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(96,165,250,0.13)" }}>
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-1.5 no-scrollbar">
          {([
            { id: "overview", label: "Overview", ref: overviewRef },
            { id: "benchmark", label: "Benchmark", ref: benchmarkRef },
            { id: "allocation", label: "Allocation", ref: allocationRef },
            { id: "sip", label: "SIP Health", ref: sipHealthRef },
            { id: "performance", label: "Performance", ref: performanceRef },
            { id: "snapshot", label: "Snapshot", ref: snapshotRef },
          ] as Array<{ id: string; label: string; ref: React.RefObject<HTMLDivElement> }>).map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); tab.ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
              style={activeTab === tab.id
                ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", boxShadow: "0 2px 10px rgba(99,102,241,0.4)" }
                : { color: "rgba(148,163,184,0.85)" }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4 relative z-10">
        {/* Top bar: Back + title + Download */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Full Report</span>
          </button>
          <div className="flex items-center gap-2">
            <Button
              onClick={downloadPDF}
              disabled={isDownloading}
              className="bg-slate-900 text-white hover:bg-slate-700 px-3 sm:px-4"
              data-testid="button-download-concise-pdf"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <Download className="w-4 h-4 sm:mr-2" />}
              <span className="hidden sm:inline">{isDownloading ? "Generating…" : "PDF"}</span>
            </Button>
          </div>
        </div>

        {/* Report content */}
        <div ref={reportRef} className="space-y-6">

          {/* Header */}
          <div className="pb-4 border-b border-slate-200/20">
            {investorName && (
              <div className="flex items-center flex-wrap gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{investorName}</h1>
                {report.investorType && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    report.investorType.toLowerCase().includes("aggressive")
                      ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
                      : report.investorType.toLowerCase().includes("moderate")
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  }`}>
                    <Shield className="w-3 h-3" />
                    {report.investorType}{report.ageGroup ? ` · ${report.ageGroup}` : ""}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Concise Report · Analyzed on {report.createdAt ? format(new Date(report.createdAt), "MMMM d, yyyy") : "Unknown Date"}</span>
            </div>
          </div>

          {/* 1. Portfolio Overview */}
          <div ref={overviewRef} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden" data-testid="card-portfolio-overview">
            {(() => {
              const absoluteReturn = totalValuation - totalInvested;
              const absoluteReturnPct = totalInvested > 0 ? (absoluteReturn / totalInvested) * 100 : 0;
              const approxCagr = totalInvested > 0 ? ((Math.pow(totalValuation / totalInvested, 1 / 2) - 1) * 100) : 0;
              const accounts = analysis.account_summaries || [];
              const totalSchemes = mfSnapshot.length;
              const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444'];
              const pieData = accounts.map((a: any) => ({ name: a.type, value: a.value || 0 }));
              const pieTotal = accounts.reduce((s: number, a: any) => s + (a.value || 0), 0);
              const isPositive = absoluteReturn >= 0;
              return (
                <>
                  {/* Hero Header */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-700 to-purple-800 px-5 sm:px-7 py-6 sm:py-7 text-white">
                    {/* Decorative blobs */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-fuchsia-500/30 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-16 -left-10 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl" />
                    {/* Grid pattern */}
                    <div
                      className="absolute inset-0 opacity-[0.08] pointer-events-none"
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                      }}
                    />

                    <div className="relative flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm mb-3">
                          <Sparkles className="w-3 h-3 text-amber-300" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/95">Snapshot</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight">Portfolio Overview</h3>
                        <div className="flex items-center gap-1.5 mt-2 text-violet-100 text-xs">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{format(new Date(), "MMMM d, yyyy")}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="p-3 sm:p-5 space-y-5">
                    {/* ── Total Portfolio Value from CAS ── */}
                    {(() => {
                      const casTotal = analysis.summary?.net_asset_value;
                      if (!casTotal || casTotal <= 0) return null;
                      const fmtCas = (v: number) => v >= 100000
                        ? `₹${(v / 100000).toFixed(2)} L`
                        : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
                      return (
                        <div className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 via-indigo-50 to-purple-50 px-5 py-4 flex items-center justify-between gap-4" data-testid="stat-cas-total">
                          <div className="absolute -top-6 -right-6 w-24 h-24 bg-violet-300/20 rounded-full blur-2xl" />
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                              <IndianRupee className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-violet-600 uppercase tracking-wider">Total Portfolio Value</p>
                              <p className="text-[10px] text-violet-400 mt-0.5">As reported in your CAS statement</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl sm:text-3xl font-black text-violet-700 leading-none">
                              <AnimatedCounter value={casTotal / 100000} prefix="₹" suffix=" L" decimals={2} />
                            </p>
                            <p className="text-[10px] text-violet-400 mt-0.5">{fmtCas(casTotal)}</p>
                          </div>
                        </div>
                      );
                    })()}

                    {(() => {
                      const withData     = mfSnapshot.filter((m: any) => (m.invested_amount || 0) > 0);
                      const withoutData  = mfSnapshot.filter((m: any) => !(m.invested_amount > 0));
                      const withMarket   = withData.reduce((s: number, m: any) => s + (m.valuation || 0), 0);
                      const withReturn   = withData.reduce((s: number, m: any) => s + (m.unrealised_profit_loss || 0), 0);
                      const withoutMarket= withoutData.reduce((s: number, m: any) => s + (m.valuation || 0), 0);
                      const withReturnPct= totalInvested > 0 ? (withReturn / totalInvested) * 100 : 0;
                      const isGain       = withReturn >= 0;
                      const fmtL = (v: number) => v >= 100000
                        ? `₹${(v / 100000).toFixed(2)} L`
                        : `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
                      // progress bar: how much your money grew (capped 0–200%)
                      const growthPct = totalInvested > 0
                        ? Math.min(200, (withMarket / totalInvested) * 100)
                        : 0;

                      return (
                        <>
                          {/* ── ROW 1: Hero numbers ── */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                            {/* You put in */}
                            <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-5" data-testid="stat-invested">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-400/10 rounded-full -translate-y-6 translate-x-6 blur-2xl" />
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center">
                                  <Wallet className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-xs font-semibold text-blue-600">You put in</span>
                              </div>
                              <p className="text-2xl font-bold text-slate-900 leading-none">
                                {totalInvested >= 100000
                                  ? <AnimatedCounter value={totalInvested / 100000} prefix="₹" suffix=" L" decimals={2} />
                                  : <span>₹{totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">Total amount you invested</p>
                            </div>

                            {/* Worth today */}
                            <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 sm:p-5" data-testid="stat-market">
                              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-400/10 rounded-full -translate-y-6 translate-x-6 blur-2xl" />
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  <span className="text-xs font-semibold text-emerald-600">Worth today</span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE
                                </span>
                              </div>
                              <p className="text-2xl font-bold text-emerald-700 leading-none">
                                <AnimatedCounter value={totalValuation / 100000} prefix="₹" suffix=" L" decimals={2} />
                              </p>
                              <p className="text-xs text-slate-500 mt-1">Current market value of all funds</p>
                            </div>

                            {/* Your profit / loss */}
                            <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${isGain ? 'border-teal-100 bg-gradient-to-br from-teal-50 to-emerald-50' : 'border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50'}`} data-testid="stat-returns">
                              <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-6 translate-x-6 blur-2xl ${isGain ? 'bg-teal-400/10' : 'bg-rose-400/10'}`} />
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${isGain ? 'bg-teal-100 border-teal-200' : 'bg-rose-100 border-rose-200'}`}>
                                    {isGain ? <TrendingUp className="w-4 h-4 text-teal-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
                                  </div>
                                  <span className={`text-xs font-semibold ${isGain ? 'text-teal-600' : 'text-rose-600'}`}>
                                    {isGain ? 'Your profit' : 'Your loss'}
                                  </span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isGain ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {isGain ? '+' : ''}{withReturnPct.toFixed(1)}%
                                </span>
                              </div>
                              <p className={`text-2xl font-bold leading-none ${isGain ? 'text-teal-700' : 'text-rose-700'}`}>
                                {isGain ? '+' : '-'}<AnimatedCounter value={Math.abs(withReturn) / 100000} prefix="₹" suffix=" L" decimals={2} />
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {totalInvested > 0 ? `Based on ${withData.length} fund${withData.length !== 1 ? 's' : ''} with cost data` : 'No cost data available'}
                              </p>
                            </div>
                          </div>

                          {/* ── ROW 2: Growth visual bar ── */}
                          {totalInvested > 0 && (
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-600">How your money has grown</span>
                                <span className={`text-xs font-bold ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isGain ? '📈' : '📉'} {isGain ? '+' : ''}{withReturnPct.toFixed(1)}% overall
                                </span>
                              </div>
                              <div className="relative h-4 rounded-full bg-slate-200 overflow-hidden">
                                {/* Invested baseline */}
                                <div className="absolute inset-0 w-1/2 bg-blue-300/60 rounded-full" style={{ width: '50%' }} />
                                {/* Growth fill */}
                                <div
                                  className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${isGain ? 'bg-gradient-to-r from-blue-400 to-emerald-400' : 'bg-gradient-to-r from-blue-400 to-rose-400'}`}
                                  style={{ width: `${Math.min(100, growthPct / 2)}%` }}
                                />
                              </div>
                              <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
                                <span>You put in: {fmtL(totalInvested)}</span>
                                <span>Now worth: {fmtL(withMarket)}</span>
                              </div>
                            </div>
                          )}

                          {/* ── ROW 3: Funds breakdown ── */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Funds we can calculate returns for */}
                            <div className="rounded-2xl border border-emerald-200 bg-white p-4" data-testid="card-with-data">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-700">Funds we can track fully</span>
                                <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">{withData.length} funds</span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                                  <span className="text-xs text-slate-500">Current value</span>
                                  <span className="text-sm font-bold text-slate-800">{fmtL(withMarket)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5">
                                  <span className="text-xs text-slate-500">{isGain ? 'Profit earned' : 'Loss so far'}</span>
                                  <span className={`text-sm font-bold ${isGain ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isGain ? '+' : ''}{fmtL(withReturn)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Funds without cost history */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4" data-testid="card-without-data">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-700">Funds without cost history</span>
                                <span className="ml-auto text-xs font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">{withoutData.length} funds</span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                                  <span className="text-xs text-slate-500">Current value</span>
                                  <span className="text-sm font-bold text-slate-700">{fmtL(withoutMarket)}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5">
                                  <span className="text-xs text-slate-500">Profit / loss</span>
                                  <span className="text-sm font-medium text-slate-400">Can't calculate</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ── ROW 4: Fund count + info note ── */}
                          <div className="flex flex-wrap gap-3 items-stretch">
                            <div className="flex-1 min-w-[140px] rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-4 flex items-center gap-3" data-testid="stat-schemes">
                              <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
                                <Layers className="w-5 h-5 text-violet-600" />
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-slate-900"><AnimatedCounter value={totalSchemes} /></p>
                                <p className="text-xs text-slate-500">Total funds · {accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>

                            {withoutData.length > 0 && (
                              <div className="flex-[2] min-w-[220px] flex gap-3 items-start p-4 rounded-2xl bg-amber-50 border border-amber-200">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-bold text-amber-800 mb-0.5">Why can't we calculate profit for {withoutData.length} fund{withoutData.length !== 1 ? 's' : ''}?</p>
                                  <p className="text-xs text-amber-700 leading-relaxed">
                                    These are usually Demat-held funds (via CDSL/NSDL) where the original purchase price isn't stored in the CAS statement. We can show their current value but not the profit/loss.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  </>
                );
              })()}
          </div>

          {/* benchmark anchor */}
          <div ref={benchmarkRef} />
          {/* 1b. My Portfolio vs Nifty 500 */}
          {(() => {
            const NIFTY500_1Y_FALLBACK = 7.98;
            const NIFTY500_3Y_FALLBACK = 14.66;
            const is3Y = benchmarkPeriod === "3y";
            const cagrKey = is3Y ? "3y" : "1y";
            const niftyBenchmark = is3Y
              ? (niftyLive?.return_3y ?? NIFTY500_3Y_FALLBACK)
              : (niftyLive?.return_1y ?? NIFTY500_1Y_FALLBACK);

            const fundsWithPerf = mfSnapshot.filter((mf: any) => {
              const cagr = storedPerformances[mf.isin]?.cagr?.[cagrKey];
              return cagr !== undefined && cagr !== null && !isNaN(parseFloat(String(cagr)));
            });

            const fundsWithPerf1Y = mfSnapshot.filter((mf: any) => {
              const cagr = storedPerformances[mf.isin]?.cagr?.["1y"];
              return cagr !== undefined && cagr !== null && !isNaN(parseFloat(String(cagr)));
            });

            if (fundsWithPerf1Y.length === 0) return null;
            if (fundsWithPerf.length === 0 && is3Y) return null;

            const activeList = fundsWithPerf.length > 0 ? fundsWithPerf : fundsWithPerf1Y;

            const eligibleTotalInvested = activeList.reduce((s: number, mf: any) => s + (mf.invested_amount || 0), 0);
            if (eligibleTotalInvested <= 0) return null;

            const weightedReturn = activeList.reduce((sum: number, mf: any) => {
              const cagr = parseFloat(String(storedPerformances[mf.isin]?.cagr?.[cagrKey]));
              const weight = (mf.invested_amount || 0) / eligibleTotalInvested;
              return sum + cagr * weight;
            }, 0);

            const alpha = weightedReturn - niftyBenchmark;
            const niftyAbsoluteReturn = (niftyBenchmark / 100) * eligibleTotalInvested;
            const portfolioAbsoluteReturn = (weightedReturn / 100) * eligibleTotalInvested;
            const alphaAbsolute = portfolioAbsoluteReturn - niftyAbsoluteReturn;

            const isBeating = alpha >= 0;

            const fmt2 = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
            const fmtRs = (n: number) => {
              const abs = Math.abs(n);
              const sign = n >= 0 ? "+" : "-";
              if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
              return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
            };

            const periodLabel = is3Y ? "3Y" : "1Y";

            return (
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                {/* Gradient header */}
                <div className="relative px-4 sm:px-7 pt-5 sm:pt-6 pb-5 sm:pb-7 overflow-hidden" style={{ background: "linear-gradient(to right, #7c3aed 0%, #4338ca 100%)" }}>
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
                  <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #34d399, transparent)" }} />

                  {/* Top row: label + period toggle on right */}
                  <div className="relative flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Performance Benchmark</p>
                    {/* 1Y / 3Y toggle — prominent pill */}
                    <div className="flex items-center rounded-xl overflow-hidden p-0.5" style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.18)" }}>
                      <button
                        data-testid="toggle-1y"
                        onClick={() => setBenchmarkPeriod("1y")}
                        className="px-4 py-1.5 text-xs font-black rounded-lg transition-all"
                        style={{
                          background: !is3Y ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent",
                          color: !is3Y ? "#fff" : "rgba(255,255,255,0.45)",
                          boxShadow: !is3Y ? "0 2px 8px rgba(99,102,241,0.5)" : "none",
                        }}
                      >1Y</button>
                      <button
                        data-testid="toggle-3y"
                        onClick={() => setBenchmarkPeriod("3y")}
                        className="px-4 py-1.5 text-xs font-black rounded-lg transition-all"
                        style={{
                          background: is3Y ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "transparent",
                          color: is3Y ? "#fff" : "rgba(255,255,255,0.45)",
                          boxShadow: is3Y ? "0 2px 8px rgba(99,102,241,0.5)" : "none",
                        }}
                      >3Y</button>
                    </div>
                  </div>

                  {/* Title row */}
                  <div className="relative">
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">My Portfolio <span className="text-[#fca5e8]">vs</span> Nifty 500</h3>
                  </div>

                  {/* Side-by-side big numbers */}
                  <div className="relative mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="col-span-1 rounded-xl px-3 sm:px-4 py-3" style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(129,140,248,0.3)" }}>
                      <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-indigo-300 mb-1">Portfolio</p>
                      <p className="text-xl sm:text-3xl font-black text-white">{weightedReturn.toFixed(2)}<span className="text-sm sm:text-lg">%</span></p>
                      <p className="text-[9px] sm:text-[10px] text-indigo-300 mt-0.5 hidden sm:block">Weighted {periodLabel} CAGR</p>
                    </div>
                    <div className="col-span-1 rounded-xl px-3 sm:px-4 py-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Nifty 500</p>
                      <p className="text-xl sm:text-3xl font-black text-slate-300">{niftyBenchmark.toFixed(2)}<span className="text-sm sm:text-lg">%</span></p>
                      <p className="sm:text-[10px] mt-0.5 hidden sm:block text-[#00c8ff] text-[10px]">Benchmark {periodLabel} CAGR</p>
                    </div>
                    <div className="col-span-1 rounded-xl px-3 sm:px-4 py-3" style={{ background: isBeating ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)", border: `1px solid ${isBeating ? "rgba(52,211,153,0.3)" : "rgba(252,165,165,0.3)"}` }}>
                      <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: isBeating ? "#6ee7b7" : "#fca5a5" }}>Alpha</p>
                      <p className="text-xl sm:text-3xl font-black" style={{ color: isBeating ? "#34d399" : "#f87171" }}>{fmt2(alpha)}</p>
                      <p className="text-[9px] sm:text-[10px] mt-0.5 hidden sm:block" style={{ color: isBeating ? "#6ee7b7" : "#fca5a5" }}>vs benchmark</p>
                    </div>
                  </div>
                </div>
                {/* White body */}
                <div className="bg-white px-4 sm:px-7 py-5 space-y-5">

                  {/* Line chart */}
                  {(() => {
                    const BASE = 100000;
                    const portMonthly = Math.pow(1 + weightedReturn / 100, 1 / 12) - 1;
                    const niftyMonthly = Math.pow(1 + niftyBenchmark / 100, 1 / 12) - 1;
                    const totalPoints = is3Y ? 37 : 13;
                    const ALL_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const currentMonthIdx = new Date().getMonth(); // 0 = Jan
                    const chartData = Array.from({ length: totalPoints }, (_, i) => {
                      let label = "";
                      if (!is3Y) {
                        label = ALL_MONTHS[(currentMonthIdx + i) % 12];
                      } else {
                        if (i === 0) label = "Start";
                        else if (i === 12) label = "Yr 1";
                        else if (i === 24) label = "Yr 2";
                        else if (i === 36) label = "Yr 3";
                        else label = "";
                      }
                      return {
                        month: label,
                        portfolio: parseFloat((BASE * Math.pow(1 + portMonthly, i)).toFixed(0)),
                        nifty: parseFloat((BASE * Math.pow(1 + niftyMonthly, i)).toFixed(0)),
                      };
                    });

                    const allVals = chartData.flatMap(d => [d.portfolio, d.nifty]);
                    const minVal = Math.min(...allVals);
                    const maxVal = Math.max(...allVals);
                    const pad = (maxVal - minVal) * 0.1 || 500;
                    const yMin = Math.floor((minVal - pad) / 1000) * 1000;
                    const yMax = Math.ceil((maxVal + pad) / 1000) * 1000;
                    const fmtY = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`;

                    return (
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            Simulated Growth of ₹1 Lakh · {is3Y ? "36 Months" : "12 Months"}
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-0.5 rounded-full bg-indigo-500 inline-block" />
                              <span className="text-[10px] font-semibold text-slate-500">Your Portfolio</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-0.5 rounded-full bg-slate-400 inline-block" style={{ borderStyle: "dashed" }} />
                              <span className="text-[10px] font-semibold text-slate-500">Nifty 500</span>
                            </div>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                            <defs>
                              <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.12} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[yMin, yMax]} tickFormatter={fmtY} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} width={46} />
                            <RechartsTooltip
                              contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                              formatter={(value: any, name: string) => [`₹${Number(value).toLocaleString("en-IN")}`, name === "portfolio" ? "Your Portfolio" : "Nifty 500 TRI"]}
                              labelStyle={{ fontWeight: 700, color: "#334155", marginBottom: 4 }}
                            />
                            <Area type="monotone" dataKey="nifty" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" fill="url(#niftyGrad)" dot={false} activeDot={{ r: 4, fill: "#94a3b8" }} />
                            <Area type="monotone" dataKey="portfolio" stroke="#6366f1" strokeWidth={2.5} fill="url(#portfolioGrad)" dot={false} activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }} />
                          </AreaChart>
                        </ResponsiveContainer>
                        <div className="flex items-center justify-end gap-5 mt-1 pr-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-indigo-500 font-bold">
                              Portfolio end: {chartData[chartData.length - 1].portfolio >= 100000
                                ? `₹${(chartData[chartData.length - 1].portfolio / 100000).toFixed(2)}L`
                                : `₹${(chartData[chartData.length - 1].portfolio / 1000).toFixed(2)}K`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Nifty 500 end: {chartData[chartData.length - 1].nifty >= 100000
                                ? `₹${(chartData[chartData.length - 1].nifty / 100000).toFixed(2)}L`
                                : `₹${(chartData[chartData.length - 1].nifty / 1000).toFixed(2)}K`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Divider */}
                  <div className="border-t border-slate-100" />

                  {/* Absolute return section */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">Absolute Return · On Invested Value ({periodLabel})</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl p-3.5 bg-indigo-50 border border-indigo-100 text-center">
                        <p className="text-[10px] text-indigo-400 font-semibold mb-1">Your Portfolio Earned</p>
                        <p className="text-base font-black text-indigo-600">{fmtRs(portfolioAbsoluteReturn)}</p>
                      </div>
                      <div className="rounded-xl p-3.5 bg-slate-50 border border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-semibold mb-1">Nifty 500 Would Earn</p>
                        <p className="text-base font-black text-slate-600">{fmtRs(niftyAbsoluteReturn)}</p>
                      </div>
                      <div
                        className="rounded-xl p-3.5 text-center border"
                        style={{ backgroundColor: isBeating ? "#ecfdf5" : "#fef2f2", borderColor: isBeating ? "#d1fae5" : "#fee2e2" }}
                      >
                        <p className="text-[10px] font-semibold mb-1" style={{ color: isBeating ? "#059669" : "#dc2626" }}>Extra {isBeating ? "Earned" : "Missed"}</p>
                        <p className="text-base font-black" style={{ color: isBeating ? "#10b981" : "#ef4444" }}>{fmtRs(alphaAbsolute)}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    * Based on {activeList.length} of {mfSnapshot.length} fund{mfSnapshot.length !== 1 ? "s" : ""} with available {periodLabel} CAGR data.{activeList.length < mfSnapshot.length ? ` ${mfSnapshot.length - activeList.length} fund(s) excluded due to unavailable data.` : ""}{" "}
                    Nifty 500 TRI {periodLabel} return used as benchmark ({niftyBenchmark}%
                    {niftyLive?.source === "supabase" && niftyLive.as_of_date
                      ? ` · updated ${new Date(niftyLive.as_of_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                      : " · fallback value"}).
                  </p>
                </div>
              </div>
            );
          })()}

          {/* allocation anchor */}
          <div ref={allocationRef} />
          {/* 2. Asset Allocation Check */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {(() => {
              const idealMap: Record<string, number> = {};
              allCategories.forEach(c => { idealMap[c] = parseIdeal(idealRaw[c]); });
              const actMap: Record<string, number> = {};
              mfSnapshot.forEach((mf: any) => {
                const cat = (mf.fund_category || "").toLowerCase();
                const pct = totalVal > 0 ? (mf.valuation / totalVal) * 100 : 0;
                if (cat.includes("equity")) actMap["Equity"] = (actMap["Equity"] || 0) + pct;
                else if (cat.includes("debt")) actMap["Debt"] = (actMap["Debt"] || 0) + pct;
                else if (cat.includes("hybrid")) actMap["Hybrid"] = (actMap["Hybrid"] || 0) + pct;
                else if (cat.includes("gold") || cat.includes("silver")) actMap["Gold/Silver"] = (actMap["Gold/Silver"] || 0) + pct;
                else actMap["Others"] = (actMap["Others"] || 0) + pct;
              });
              let healthScore = 100;
              allCategories.forEach(c => { healthScore -= Math.abs((actMap[c] || 0) - (idealMap[c] || 0)) * 0.8; });
              healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
              const healthLabel = healthScore >= 80 ? "Well balanced" : healthScore >= 60 ? "Needs rebalancing" : "Needs attention";
              const healthColor = healthScore >= 80 ? "#10b981" : healthScore >= 60 ? "#f59e0b" : "#ef4444";
              const missingCategories = allCategories.filter(c => (actMap[c] || 0) < 0.01 && idealMap[c] > 0);
              const fmtDiff = (actual: number, ideal: number) => {
                const d = actual - ideal;
                return `${d >= 0 ? '+' : ''}${Math.abs(d).toFixed(2)}% ${d >= 0 ? "over" : "under"} ideal`;
              };
              const equityActual = actMap["Equity"] || 0;
              const equityIdeal = idealMap["Equity"] || 0;
              const debtActual = actMap["Debt"] || 0;
              const debtIdeal = idealMap["Debt"] || 0;
              return (
                <>
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-4 sm:px-6 py-5 flex items-start justify-between gap-3 flex-wrap text-white">
                    <div>
                      <h3 className="text-[20px] text-left text-white font-bold">Asset allocation check</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-indigo-200 text-xs font-semibold">{report.investorType || "—"}</span>
                        <span className="text-indigo-200 text-xs font-semibold">Age {report.ageGroup || "—"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-indigo-200 font-medium mb-0.5 uppercase tracking-wider">Overall health</div>
                      <div className="text-3xl font-bold text-white">{healthScore}<span className="text-base font-semibold text-indigo-200">/100</span></div>
                      <span className="text-xs font-semibold text-white">{healthLabel}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-0 border-b border-slate-100">
                    <div className="px-3 sm:px-6 py-4 border-r border-slate-100">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Equity</div>
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">{equityActual.toFixed(2)}%</div>
                      <div className="text-[10px] sm:text-xs mt-0.5" style={{ color: equityActual > equityIdeal ? "#ef4444" : "#10b981" }}>{fmtDiff(equityActual, equityIdeal)}</div>
                    </div>
                    <div className="px-3 sm:px-6 py-4 border-r border-slate-100">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Debt</div>
                      <div className="text-xl sm:text-2xl font-bold text-amber-500">{debtActual.toFixed(2)}%</div>
                      <div className="text-[10px] sm:text-xs mt-0.5" style={{ color: debtActual > debtIdeal ? "#ef4444" : "#10b981" }}>{fmtDiff(debtActual, debtIdeal)}</div>
                    </div>
                    <div className="px-3 sm:px-6 py-4">
                      <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Missing</div>
                      {missingCategories.length === 0 ? (
                        <div className="text-xl sm:text-2xl font-bold text-emerald-500">None</div>
                      ) : (
                        <>
                          <div className="text-xl sm:text-2xl font-bold text-red-500">{missingCategories.length}</div>
                          <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{missingCategories.join(", ")}</div>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Allocation Comparison Table */}
                  <div className="px-3 sm:px-6 pt-4 pb-5">
                    <div className="overflow-hidden rounded-xl border border-slate-200" style={{ boxShadow: "0 2px 12px 0 rgba(59,130,246,0.06)" }}>
                      {/* Header */}
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-gradient-to-r from-slate-800 to-slate-700 px-3 sm:px-4 py-2.5">
                        <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-300">Category</div>
                        <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-300 text-center">Ideal</div>
                        <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-300 text-center">Current</div>
                        <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-300 text-center">Status</div>
                      </div>
                      {/* Rows */}
                      {allCategories.map((cat, idx) => {
                        const actual = actMap[cat] || 0;
                        const ideal = idealMap[cat] || 0;
                        const diff = actual - ideal;
                        const isOnTarget = Math.abs(diff) < 1;
                        const isOver = diff > 0;
                        const color = CATEGORY_META[cat]?.color || "#64748b";
                        const statusColor = isOnTarget ? "#10b981" : isOver ? "#ef4444" : "#f59e0b";
                        const statusLabel = isOnTarget ? "On Target" : isOver ? "Over" : "Under";
                        const statusBg = isOnTarget ? "rgba(16,185,129,0.1)" : isOver ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)";
                        return (
                          <div
                            key={cat}
                            className={`grid grid-cols-[2fr_1fr_1fr_1fr] px-3 sm:px-4 py-2.5 items-center transition-colors hover:bg-slate-50 ${idx > 0 ? "border-t border-slate-100" : ""}`}
                          >
                            {/* Category */}
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                                style={{ backgroundColor: color }}
                              >
                                {cat.slice(0, 2).toUpperCase()}
                              </span>
                              <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate">{cat}</span>
                            </div>
                            {/* Ideal */}
                            <div className="flex flex-col items-center gap-1 px-1">
                              <span className="text-xs sm:text-sm font-bold text-slate-600 tabular-nums">{ideal > 0 ? `${ideal.toFixed(1)}%` : "—"}</span>
                              <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full opacity-40" style={{ width: `${Math.min(ideal, 100)}%`, backgroundColor: color }} />
                              </div>
                            </div>
                            {/* Current */}
                            <div className="flex flex-col items-center gap-1 px-1">
                              <span className="text-xs sm:text-sm font-bold tabular-nums" style={{ color: actual > 0 ? color : "#94a3b8" }}>
                                {actual > 0 ? `${actual.toFixed(1)}%` : "—"}
                              </span>
                              <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(actual, 100)}%`, backgroundColor: color }} />
                              </div>
                            </div>
                            {/* Status */}
                            <div className="flex justify-center">
                              <span
                                className="text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap"
                                style={{ backgroundColor: statusBg, color: statusColor, border: `1px solid ${statusColor}33` }}
                              >
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Dynamic insight line */}
                    {(() => {
                      const dominant = allCategories.reduce((a, b) => (actMap[a] || 0) > (actMap[b] || 0) ? a : b, allCategories[0]);
                      const missing = allCategories.filter(c => (actMap[c] || 0) < 1 && (idealMap[c] || 0) > 0);
                      if (!dominant) return null;
                      return (
                        <div
                          className="mx-3 sm:mx-0 mt-3 px-4 py-3 rounded-xl flex items-start gap-2.5"
                          style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)" }}
                        >
                          <span className="text-indigo-400 mt-0.5 flex-shrink-0 text-base">💡</span>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            Your portfolio is currently tilted towards{" "}
                            <span className="font-semibold text-slate-800">{dominant}</span> with limited exposure to{" "}
                            <span className="font-semibold text-slate-800">
                              {missing.length > 0 ? missing.join(", ") : "other asset classes"}
                            </span>. A more balanced allocation may help improve diversification and risk management.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Category Wise Distribution */}
                  <div className="px-3 sm:px-6 py-5 border-t border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                      Portfolio Weightage by Fund Category
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {allCategories.filter(c => (actualMap[c] || 0) > 0.01).map(cat => {
                        const meta = { Equity:{color:"#3b82f6",abbr:"EQ",label:"Equity"}, Debt:{color:"#f59e0b",abbr:"DB",label:"Debt"}, Hybrid:{color:"#94a3b8",abbr:"HB",label:"Hybrid"}, "Gold/Silver":{color:"#d97706",abbr:"GS",label:"Gold / Silver"}, Others:{color:"#10b981",abbr:"OT",label:"Others"} }[cat] || {color:"#64748b",abbr:"OT",label:cat};
                        const pct = actualMap[cat] || 0;
                        const subs = Object.entries(typeMap[cat] || {}).sort((a, b) => b[1] - a[1]);
                        return (
                          <div key={cat} className="bg-slate-50 rounded-xl border border-slate-100 p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: meta.color }}>{meta.abbr}</span>
                              <div>
                                <div className="font-bold text-slate-800 text-sm">{meta.label}</div>
                                <div className="text-xs text-slate-400">{pct.toFixed(2)}% of portfolio</div>
                              </div>
                            </div>
                            <div className="h-2 rounded-full mb-4 overflow-hidden bg-slate-200">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: meta.color }} />
                            </div>
                            <div className="space-y-2">
                              {subs.map(([type, subPct]) => (
                                <div key={type} className="flex items-center gap-3">
                                  <span className="text-xs text-slate-600 w-28 flex-shrink-0 truncate">{type}</span>
                                  <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(subPct, 100)}%`, backgroundColor: meta.color }} />
                                  </div>
                                  <span className="text-xs font-semibold text-slate-700 w-12 text-right">{subPct.toFixed(2)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── Rebalancing Action Plan ────────────────────────────────────── */}
          {rebalancingPlan.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-700 to-blue-700 px-6 py-5 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4" />
                  <h3 className="text-lg font-bold">Rebalancing Action Plan</h3>
                </div>
                <p className="text-indigo-200 text-xs">{rebalancingPlan.length} categories need attention</p>
              </div>
              <div className="p-5 space-y-3">
                {rebalancingPlan.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl border" style={{ backgroundColor: item.over ? "#fef2f2" : "#fffbeb", borderColor: item.over ? "#fecaca" : "#fde68a" }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <p className="text-sm font-bold text-slate-800">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="text-xs text-slate-500">Current: <strong>{item.actual.toFixed(1)}%</strong></span>
                        <span className="text-xs text-slate-500">Target: <strong>{item.ideal.toFixed(1)}%</strong></span>
                        <span className="text-xs font-bold" style={{ color: item.over ? "#ef4444" : "#f59e0b" }}>
                          {item.over ? `↓ Reduce by ${item.diff.toFixed(1)}%` : `↑ Increase by ${Math.abs(item.diff).toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: item.over ? "#ef4444" : "#f59e0b" }} />
                  </div>
                ))}
              </div>
              {/* Rebalancing CTA */}
              <div className="px-5 pb-4 pt-1">
                <div
                  className="px-4 py-3 rounded-xl flex items-center justify-between gap-3"
                  style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)" }}
                >
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800">Need a personalized rebalancing strategy?</span>{" "}
                    Get a detailed consultation with Financial Friend.
                  </p>
                  <a
                    href="https://calendly.com/gunjan-financialfriend/financial-assessment-meeting"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-white whitespace-nowrap"
                    style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}
                  >
                    Book Now
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ── SIP Health Panel ──────────────────────────────────────────── */}
          <div ref={sipHealthRef} />
          {sipHealthItems.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-700 to-blue-700 px-6 py-5 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4" />
                  <h3 className="text-lg font-bold">SIP Health Check</h3>
                </div>
                <p className="text-indigo-200 text-xs">How your SIP funds are performing vs benchmark</p>
              </div>
              <div className="divide-y divide-slate-100">
                {sipHealthItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5" data-testid={`row-sip-health-${i}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.healthy ? "bg-emerald-400" : "bg-rose-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">SIP ₹{item.amount?.toLocaleString("en-IN")} / mo</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${item.healthy ? "text-emerald-600" : "text-rose-500"}`}>
                        {item.cagr !== null ? `${Number(item.cagr).toFixed(2)}%` : "—"}
                      </p>
                      <p className="text-[10px] text-slate-400">1Y CAGR</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${item.healthy ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"}`}>
                      {item.healthy ? "Healthy" : "Review"}
                    </span>
                  </div>
                ))}
              </div>
              {/* SIP disclaimer */}
              <div
                className="mx-4 mb-4 mt-1 px-4 py-3 rounded-xl flex items-start gap-2.5"
                style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)" }}
              >
                <span className="text-indigo-400 mt-0.5 flex-shrink-0 text-base">💡</span>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Your SIP health score is only an initial assessment based on recent performance trends. A detailed consultation is recommended for comprehensive portfolio evaluation and rebalancing guidance.
                </p>
              </div>
            </div>
          )}

          {/* performance anchor */}
          <div ref={performanceRef} />
          {/* 4. Concise Performance Check */}
          {Object.keys(storedPerformances).length > 0 && (() => {
            const scoreToRating = (pct: number) => pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 45 ? "Average" : "Poor";
            const isIndexFund = (mf: any, sc: any) =>
              /\betf\b|\bindex\b/i.test(mf.scheme_name || "") || /\bindex\b|\betf\b/i.test(sc?.category || "");
            const RATING_STYLE: Record<string, { pill: string; bar: string }> = {
              "Excellent": { pill: "bg-emerald-100 text-emerald-700 border-emerald-200", bar: "#10b981" },
              "Good":      { pill: "bg-blue-100 text-blue-700 border-blue-200",          bar: "#3b82f6" },
              "Average":   { pill: "bg-amber-100 text-amber-700 border-amber-200",       bar: "#f59e0b" },
              "Poor":      { pill: "bg-rose-100 text-rose-600 border-rose-200",          bar: "#ef4444" },
            };
            const rows = mfSnapshot
              .filter((mf: any) => storedPerformances[mf.isin])
              .map((mf: any) => {
                const perf = storedPerformances[mf.isin];
                const sc = storedScoring[mf.isin];
                const perfScore = calcPerfScore(perf?.cagr, perf?.benchmark_returns);
                const scoringTotal = sc?.totalScore ?? 0;
                const combined = scoringTotal + perfScore.total;
                const maxScore = perf ? 80 : 40;
                const pct = maxScore > 0 ? Math.round((combined / maxScore) * 100) : 0;
                const ratingRaw: string = scoreToRating(pct);
                const rating: string = isIndexFund(mf, sc) && ratingRaw === "Poor" ? "Average" : ratingRaw;
                const cagr1y = perf?.cagr?.["1y"] ?? "—";
                const cagr3y = perf?.cagr?.["3y"] ?? "—";
                const cagr5y = perf?.cagr?.["5y"] ?? "—";
                const bm1y = perf?.benchmark_returns?.["1y"] ?? null;
                const bm3y = perf?.benchmark_returns?.["3y"] ?? null;
                const bm5y = perf?.benchmark_returns?.["5y"] ?? null;
                return { mf, perf, sc, perfScore, combined, maxScore, rating, pct, cagr1y, cagr3y, cagr5y, bm1y, bm3y, bm5y };
              });

            const ratingCounts: Record<string, number> = { Excellent: 0, Good: 0, Average: 0, Poor: 0 };
            rows.forEach((r: { rating: string }) => { if (r.rating in ratingCounts) ratingCounts[r.rating]++; });

            const RATING_CONFIG = [
              { key: "Excellent", label: "Excellent", color: "#10b981", bg: "#ecfdf5", border: "#6ee7b7" },
              { key: "Good",      label: "Good",      color: "#3b82f6", bg: "#eff6ff", border: "#93c5fd" },
              { key: "Average",   label: "Average",   color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" },
              { key: "Poor",      label: "Poor",      color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" },
            ];

            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-6 py-5 text-white">
                  <h3 className="text-lg font-bold text-white">Concise Performance Check</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">{rows.length} fund{rows.length !== 1 ? "s" : ""} analysed · Rating overview</p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    {[
                      { label: "Poor",      range: "< 45%",    color: "#fca5a5" },
                      { label: "Average",   range: "45 – 59%", color: "#fcd34d" },
                      { label: "Good",      range: "60 – 79%", color: "#93c5fd" },
                      { label: "Excellent", range: "80 – 100%",color: "#6ee7b7" },
                    ].map(b => (
                      <span key={b.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: b.color }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: b.color }} />
                        {b.label} · {b.range}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 sm:p-8">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
                    {RATING_CONFIG.map(({ key, label, color, bg, border }) => {
                      const count = ratingCounts[key] || 0;
                      return (
                        <div
                          key={key}
                          className="flex flex-col items-center justify-center rounded-2xl py-5 sm:py-8 px-2 sm:px-4"
                          style={{ backgroundColor: bg, border: `2px solid ${border}` }}
                        >
                          <div
                            className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 sm:mb-4"
                            style={{ backgroundColor: color + "22", border: `3px solid ${color}` }}
                          >
                            <span className="text-3xl sm:text-4xl font-black" style={{ color }}>{count}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-bold tracking-wide" style={{ color }}>{label}</span>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">{count === 1 ? "fund" : "funds"}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ranked fund list */}
                  {rows.length > 0 && (
                    <div className="mt-2 px-4 sm:px-8 pb-6">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Fund Rankings</p>
                      <div className="space-y-2">
                        {[...rows].sort((a, b) => b.pct - a.pct).map((r, i) => {
                          const style = RATING_STYLE[r.rating];
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-xl px-3 py-2.5 transition-colors"
                              onClick={() => setSelectedFundIsin(r.mf.isin)}
                              data-testid={`row-perf-fund-${i}`}
                            >
                              <span className="text-[11px] font-black text-slate-400 w-4 flex-shrink-0">{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">{r.mf.scheme_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${r.pct}%`, backgroundColor: style.bar }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500">{r.pct}%</span>
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${style.pill}`}>{r.rating}</span>
                              <Eye className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Performance disclaimer */}
                  <div
                    className="mx-5 mb-5 mt-2 px-4 py-3 rounded-xl flex items-start gap-2.5"
                    style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)" }}
                  >
                    <span className="text-indigo-400 mt-0.5 flex-shrink-0 text-base">💡</span>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      This is a concise performance check. For a detailed analysis and personalized report,{" "}
                      <a
                        href="https://calendly.com/gunjan-financialfriend/financial-assessment-meeting"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-indigo-600 underline underline-offset-2"
                      >
                        book a free consultation
                      </a>.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* snapshot anchor */}
          <div ref={snapshotRef} />
          {/* 5. Portfolio Snapshot - Mutual Fund Units */}
          {mfSnapshot.length > 0 && (() => {
            const inr = (n: number, dp = 2) =>
              n.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
            const totalInvestedSnap = mfSnapshot.reduce((s: number, mf: any) => s + (mf.invested_amount || 0), 0);
            const totalValueSnap = mfSnapshot.reduce((s: number, mf: any) => s + (mf.valuation || 0), 0);
            const totalPLSnap = totalValueSnap - totalInvestedSnap;

            const filtered = mfSnapshot.filter((mf: any) =>
              !snapshotSearch || (mf.scheme_name || "").toLowerCase().includes(snapshotSearch.toLowerCase())
            );

            const sortKey = snapshotSort.col;
            const sortDir = snapshotSort.dir;
            const sorted = [...filtered].sort((a: any, b: any) => {
              let av: number, bv: number;
              if (sortKey === "name") {
                av = (a.scheme_name || "").charCodeAt(0);
                bv = (b.scheme_name || "").charCodeAt(0);
              } else if (sortKey === "value") {
                av = a.valuation || 0; bv = b.valuation || 0;
              } else if (sortKey === "pl") {
                av = (a.valuation || 0) - (a.invested_amount || 0);
                bv = (b.valuation || 0) - (b.invested_amount || 0);
              } else {
                av = a.invested_amount || 0; bv = b.invested_amount || 0;
              }
              return sortDir === "asc" ? av - bv : bv - av;
            });

            const toggleSort = (key: string) => setSnapshotSort(s => ({ col: key, dir: s.col === key && s.dir === "desc" ? "asc" : "desc" }));
            const SortIcon = ({ col }: { col: string }) => snapshotSort.col === col
              ? (snapshotSort.dir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)
              : <ChevronDown className="w-3 h-3 inline ml-1 opacity-30" />;

            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-6 py-5 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white" data-testid="text-snapshot-heading">Portfolio Snapshot</h3>
                      <p className="text-indigo-200 text-xs mt-0.5">{mfSnapshot.length} funds · click a row for details</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-300 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search fund…"
                          value={snapshotSearch}
                          onChange={e => setSnapshotSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/15 border border-white/25 text-white placeholder-violet-300 outline-none focus:bg-white/25 w-40"
                          data-testid="input-snapshot-search"
                        />
                        {snapshotSearch && (
                          <button onClick={() => setSnapshotSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                            <X className="w-3 h-3 text-violet-300" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("name")}>
                          Scheme <SortIcon col="name" />
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Units</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">NAV</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("invested")}>
                          Invested <SortIcon col="invested" />
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("value")}>
                          Value <SortIcon col="value" />
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("pl")}>
                          P/L <SortIcon col="pl" />
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">% Portfolio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((mf: any, idx: number) => {
                        const units = mf.units ?? mf.closing_balance ?? 0;
                        const nav = mf.nav ?? (units > 0 && mf.valuation ? mf.valuation / units : 0);
                        const invested = mf.invested_amount ?? 0;
                        const value = mf.valuation ?? 0;
                        const isDemat = mf.source === "demat";
                        const pl = isDemat ? null : value - invested;
                        const plColor = pl == null ? "text-slate-400" : pl >= 0 ? "text-emerald-600" : "text-rose-600";
                        const portfolioPct = totalValueSnap > 0 ? ((value / totalValueSnap) * 100).toFixed(1) : "0.0";
                        const hasPerf = !!storedPerformances[mf.isin];
                        return (
                          <tr
                            key={idx}
                            className={`border-b border-slate-100 transition-colors ${hasPerf ? "cursor-pointer hover:bg-violet-50" : "hover:bg-slate-50"}`}
                            onClick={() => hasPerf && setSelectedFundIsin(mf.isin)}
                            data-testid={`row-snapshot-${idx}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-semibold text-slate-800 text-xs leading-tight">{mf.scheme_name || "—"}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {mf.fund_category && <p className="text-[10px] text-slate-400">{mf.fund_category}</p>}
                                    {isDemat && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-violet-100 text-violet-600">DEMAT</span>}
                                  </div>
                                </div>
                                {hasPerf && <Eye className="w-3.5 h-3.5 text-violet-300 flex-shrink-0 ml-auto" />}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700 tabular-nums text-xs">{inr(units, 3)}</td>
                            <td className="px-4 py-3 text-right text-slate-700 tabular-nums text-xs">{inr(nav, 4)}</td>
                            <td className="px-4 py-3 text-right text-slate-700 tabular-nums text-xs">{isDemat ? <span className="text-slate-400">—</span> : inr(invested, 2)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums text-xs">{inr(value, 2)}</td>
                            <td className={`px-4 py-3 text-right font-semibold tabular-nums text-xs ${plColor}`}>
                              {pl == null ? "—" : `${pl >= 0 ? "+" : "-"}${inr(Math.abs(pl), 2)}`}
                            </td>
                            <td className="px-4 py-3 text-right text-xs">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.min(parseFloat(portfolioPct), 100)}%` }} />
                                </div>
                                <span className="text-slate-600 tabular-nums font-medium w-8 text-right">{portfolioPct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 text-white">
                        <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-[#3aded1] font-bold">Grand Total</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-xs">₹{inr(totalInvestedSnap, 2)}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-xs">₹{inr(totalValueSnap, 2)}</td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums text-xs ${totalPLSnap >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {totalPLSnap < 0 ? "-" : ""}₹{inr(Math.abs(totalPLSnap), 2)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {filtered.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-sm">No funds match "{snapshotSearch}"</div>
                )}
              </div>
            );
          })()}

          {/* Detailed report CTA */}
          <div className="mt-12 mb-4 w-full" data-testid="section-detailed-report-cta">
            <div
              className="relative w-full overflow-hidden rounded-2xl border px-6 py-8 md:px-10 md:py-10"
              style={{
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,78,59,0.35) 50%, rgba(2,44,34,0.55) 100%)",
                borderColor: "rgba(51, 242, 137, 0.35)",
                boxShadow:
                  "0 10px 40px -10px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-40"
                style={{ background: "radial-gradient(circle, #33f289 0%, transparent 70%)" }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-30"
                style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
              />

              <div className="relative flex flex-col items-center text-center gap-5">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
                  style={{
                    background: "rgba(51, 242, 137, 0.15)",
                    border: "1px solid rgba(51, 242, 137, 0.4)",
                    color: "#33f289",
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Personalised Advisory
                </div>

                <h3
                  className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight text-white max-w-3xl"
                  data-testid="text-detailed-report-cta"
                >
                  Want a <span className="text-[#33f289]">detailed report</span> and advisory for your portfolio?
                </h3>

                <p className="text-sm md:text-base text-white/70 max-w-2xl">
                  Connect with our experts at Financial Friend for a deep-dive analysis,
                  rebalancing recommendations, and a tailored investment roadmap built for your goals.
                </p>

                <div className="mt-2 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 w-full max-w-2xl">
                  <a
                    href={(() => {
                      const msg = [
                        `Hi Financial Friend! 👋`,
                        ``,
                        `I just reviewed my portfolio analysis on CasAnalyser.`,
                        ``,
                        `Name: ${investorName || "—"}`,
                        ``,
                        `Risk Profile: ${report?.investorType || "—"} | Age Group: ${report?.ageGroup || "—"}`,
                        ``,
                        `I'd love to get a detailed advisory and rebalancing recommendations. Please connect with me!`,
                      ].join("\n");
                      return `https://wa.me/919351104008?text=${encodeURIComponent(msg)}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] hover:shadow-xl"
                    style={{
                      background: "linear-gradient(135deg, #33f289 0%, #10b981 100%)",
                      color: "#022c22",
                      boxShadow: "0 8px 24px -6px rgba(51, 242, 137, 0.5)",
                    }}
                    data-testid="link-cta-whatsapp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat on WhatsApp
                  </a>
                  <a
                    href="mailto:gunjan@financialfriend.in"
                    className="group flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
                    data-testid="link-cta-email"
                  >
                    <Mail className="w-4 h-4 text-[#33f289]" />
                    <span className="truncate">gunjan@financialfriend.in</span>
                  </a>
                  <a
                    href="tel:+919351104008"
                    className="group flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] hover:shadow-lg"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
                    data-testid="link-cta-call"
                  >
                    <Phone className="w-4 h-4 text-[#33f289]" />
                    +91 93511 04008
                  </a>
                  <a
                    href="https://calendly.com/gunjan-financialfriend/financial-assessment-meeting"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] hover:shadow-xl"
                    style={{
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                      color: "#ffffff",
                      boxShadow: "0 8px 24px -6px rgba(99, 102, 241, 0.5)",
                    }}
                    data-testid="link-cta-calendly"
                  >
                    <CalendarDays className="w-4 h-4" />
                    Book a Free Meeting
                  </a>
                </div>

                <p className="text-xs text-white/50 mt-1">
                  Typically responds within a few hours · Mon–Sat
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Back to Top Button ───────────────────────────────────────────── */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center shadow-xl transition-all hover:scale-110"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 4px 20px rgba(99,102,241,0.5)" }}
          aria-label="Back to top"
          data-testid="button-back-to-top"
        >
          <ChevronUp className="w-5 h-5 text-white" />
        </button>
      )}

      {/* ── Fund Detail Modal ────────────────────────────────────────────── */}
      {selectedFundData && (
        <FundDetailModal
          fund={selectedFundData.fund}
          perf={selectedFundData.perf}
          scoring={selectedFundData.scoring}
          onClose={() => setSelectedFundIsin(null)}
        />
      )}
    </div>
  );
}