import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Mail, CheckCircle2, Download, Loader2, HelpCircle } from "lucide-react";
import { UploadCard } from "@/components/UploadCard";
import { ReportView } from "@/components/ReportView";
import { useReport } from "@/hooks/use-reports";
import { motion, AnimatePresence } from "framer-motion";
import { Upload as UploadIcon, MailPlus } from "lucide-react";
import { ChevronRight, BarChart2, Zap } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { Button } from "@/components/ui/button";
import { ShinyButton } from "@/components/ui/shiny-button";
import { SiGoogle } from "react-icons/si";
import { OnboardingModal } from "@/components/OnboardingModal";
import { RegistrationModal, SESSION_TOKEN_KEY } from "@/components/RegistrationModal";
import casAnalyzerLogo from "@assets/ChatGPT_Image_Apr_23,_2026,_02_45_29_PM_1776935868469.png";
import financialFriendLogo from "@assets/ChatGPT_Image_Apr_24__2026__02_36_06_PM-removebg-preview_1777021600827.png";

interface GmailPdf {
  messageId: string;
  attachmentId: string;
  filename: string;
  size: number;
  from: string;
  subject: string;
  date: string;
}

function RotatingHeadline() {
  const phrases = [
    {
      icon: UploadIcon,
      lead: "Have your CAS report?",
      accent: "Just upload it.",
      gradient: "linear-gradient(90deg, #60a5fa, #c084fc)",
    },
    {
      icon: MailPlus,
      lead: "Don't have one?",
      accent: "Connect Gmail to fetch it.",
      gradient: "linear-gradient(90deg, #34d399, #60a5fa)",
    },
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % phrases.length);
    }, 3800);
    return () => clearInterval(t);
  }, []);

  const current = phrases[idx];
  const Icon = current.icon;

  return (
    <motion.h1
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="text-4xl md:text-6xl font-bold font-display tracking-tight leading-[1.1] min-h-[6.5rem] md:min-h-[9rem] flex items-center justify-center"
      style={{ color: "#f1f5f9" }}
      data-testid="text-hero-rotating"
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="block"
        >
          <span className="inline-flex items-center gap-3 justify-center flex-wrap">
            <span>{current.lead}</span>
          </span>
          <span className="block mt-2">
            <span
              style={{
                background: current.gradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {current.accent}
            </span>
          </span>
        </motion.span>
      </AnimatePresence>
    </motion.h1>
  );
}

export default function Home() {
  const [activeReportId, setActiveReportId] = useState<number | null>(null);
  const [externalFile, setExternalFile] = useState<File | null>(null);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  // null = still checking, true = recognised, false = new user
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [, navigate] = useLocation();

  // On mount: verify session token from localStorage before showing the form
  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem(SESSION_TOKEN_KEY);

    if (!token) {
      // No token — definitely a new user, show registration after a short delay
      setIsRegistered(false);
      const t = setTimeout(() => setShowRegistration(true), 400);
      return () => clearTimeout(t);
    }

    // Verify the token with the backend
    fetch("/api/session/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken: token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          // Returning user — skip registration form entirely
          setIsRegistered(true);
          const onboardingSeen = localStorage.getItem("finanalyze_onboarding_seen");
          if (!onboardingSeen) {
            setTimeout(() => setShowOnboarding(true), 400);
          }
        } else {
          // Token invalid or user deleted — clear it and prompt registration
          localStorage.removeItem(SESSION_TOKEN_KEY);
          setIsRegistered(false);
          setTimeout(() => setShowRegistration(true), 400);
        }
      })
      .catch(() => {
        // Network error — fall back to showing registration
        setIsRegistered(false);
        setTimeout(() => setShowRegistration(true), 400);
      });
  }, []);

  const closeOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("finanalyze_onboarding_seen", "1");
    }
  };

  const handleRegistrationSuccess = () => {
    setShowRegistration(false);
    setIsRegistered(true);
    const onboardingSeen = localStorage.getItem("finanalyze_onboarding_seen");
    if (!onboardingSeen) {
      setTimeout(() => setShowOnboarding(true), 300);
    }
  };

  const handleGetStarted = () => {
    if (!isRegistered) {
      setShowRegistration(true);
    } else {
      scrollToUpload();
    }
  };

  const scrollToUpload = () => {
    setTimeout(() => {
      document
        .getElementById("upload-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleConnectGmail = () => {
    window.location.href = "/auth/google";
  };

  const { data: activeReport, isLoading: isLoadingReport } = useReport(activeReportId);

  const { data: gmailStatus, refetch: refetchGmail } = useQuery<{
    connected: boolean;
    email?: string;
    displayName?: string;
  }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: gmailPdfsData, isLoading: isLoadingPdfs } = useQuery<{
    pdfs: GmailPdf[];
  }>({
    queryKey: ["/api/gmail/cas-pdfs"],
    enabled: !!gmailStatus?.connected,
  });

  const handleSelectGmailPdf = async (pdf: GmailPdf) => {
    try {
      setLoadingPdfId(pdf.messageId);
      const res = await fetch(
        `/api/gmail/attachment/${pdf.messageId}/${pdf.attachmentId}?filename=${encodeURIComponent(pdf.filename)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Failed to fetch PDF");
      const blob = await res.blob();
      const file = new File([blob], pdf.filename || "cas.pdf", {
        type: "application/pdf",
      });
      setExternalFile(file);
      setTimeout(() => {
        document
          .getElementById("upload-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPdfId(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success" || params.get("auth") === "failed") {
      refetchGmail();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refetchGmail]);

  return (
    <div className="min-h-screen font-sans pb-20 relative overflow-x-hidden">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setActiveReportId(null)}
          >
            <img
              src={casAnalyzerLogo}
              alt="Cas Analyzer"
              className="h-10 w-auto object-contain"
              data-testid="img-logo"
            />
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm font-medium" style={{ color: "rgba(148,163,184,0.9)" }}>
            <span>
              Product by{" "}
              <a
                href="https://www.financialfriend.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-300 transition-colors"
                data-testid="link-financial-friend-nav"
              >
                Financial Friend
              </a>
            </span>
            <a
              href="https://www.financialfriend.in/"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-financial-friend-logo"
            >
              <img
                src={financialFriendLogo}
                alt="Financial Friend"
                className="h-24 w-auto object-contain"
                data-testid="img-financial-friend-logo"
              />
            </a>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 relative z-10">
        <AnimatePresence mode="wait">
          {!activeReportId ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              {/* Hero Section */}
              <div className="text-center space-y-6 max-w-3xl mx-auto">
                <RotatingHeadline />
              </div>

              {/* Gmail Connect */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center"
              >
                {gmailStatus?.connected ? (
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border"
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      borderColor: "rgba(52,211,153,0.4)",
                      color: "#6ee7b7",
                    }}
                    data-testid="status-gmail-connected"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Connected: {gmailStatus.email} ✅</span>
                  </div>
                ) : (
                  <ShinyButton
                    onClick={() => {
                      window.location.href = "/auth/google";
                    }}
                    className="relative z-20"
                    data-testid="button-connect-gmail"
                  >
                    <SiGoogle className="w-4 h-4" />
                    Connect with Google
                  </ShinyButton>
                )}
              </motion.div>

              {/* Gmail CAS PDFs */}
              {gmailStatus?.connected && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="max-w-2xl mx-auto"
                >
                  <div
                    className="rounded-2xl p-5 border"
                    style={{
                      background: "rgba(15, 20, 50, 0.6)",
                      borderColor: "rgba(96,165,250,0.2)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="w-4 h-4" style={{ color: "#60a5fa" }} />
                      <h3
                        className="text-sm font-bold uppercase tracking-wider"
                        style={{ color: "#e2e8f0" }}
                      >
                        Recent CAS PDFs from your Gmail
                      </h3>
                    </div>

                    {isLoadingPdfs ? (
                      <div className="flex items-center gap-2 py-4 text-sm" style={{ color: "rgba(148,163,184,0.7)" }}>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Scanning Gmail inbox...
                      </div>
                    ) : !gmailPdfsData?.pdfs || gmailPdfsData.pdfs.length === 0 ? (
                      <p className="text-sm py-2" style={{ color: "rgba(148,163,184,0.7)" }}>
                        No CAS PDF emails found from CAMS, NSDL, or CDSL.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {gmailPdfsData.pdfs.map((pdf) => {
                          const isLoading = loadingPdfId === pdf.messageId;
                          const fromMatch = pdf.from.match(/<([^>]+)>/);
                          const fromEmail = fromMatch ? fromMatch[1] : pdf.from;
                          const dateStr = pdf.date
                            ? new Date(pdf.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "";
                          return (
                            <button
                              key={pdf.messageId}
                              onClick={() => handleSelectGmailPdf(pdf)}
                              disabled={isLoading}
                              className="w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all hover:border-blue-400/60 disabled:opacity-60"
                              style={{
                                background: "rgba(10, 15, 40, 0.5)",
                                borderColor: "rgba(96,165,250,0.2)",
                              }}
                              data-testid={`button-gmail-pdf-${pdf.messageId}`}
                            >
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{
                                  background: "rgba(59,111,255,0.15)",
                                  color: "#60a5fa",
                                }}
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-sm font-semibold truncate"
                                  style={{ color: "#e2e8f0" }}
                                >
                                  {pdf.filename}
                                </p>
                                <p
                                  className="text-xs truncate"
                                  style={{ color: "rgba(148,163,184,0.7)" }}
                                >
                                  {fromEmail} · {dateStr}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* OR Divider */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex items-center justify-center gap-4 max-w-sm mx-auto"
                data-testid="divider-or"
              >
                <span
                  className="flex-1 h-px"
                  style={{ background: "rgba(96,165,250,0.25)" }}
                />
                <span
                  className="text-2xl font-black uppercase tracking-[0.2em]"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  OR
                </span>
                <span
                  className="flex-1 h-px"
                  style={{ background: "rgba(96,165,250,0.25)" }}
                />
              </motion.div>

              {/* Upload Component */}
              <motion.div
                id="upload-section"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="relative z-10"
              >
                <div
                  className="absolute inset-0 -z-10 blur-3xl scale-150 transform opacity-20"
                  style={{
                    background: "radial-gradient(ellipse, #3b6fff 0%, transparent 70%)",
                  }}
                />
                <UploadCard
                  onSuccess={(slug) => navigate(`/reports/${slug}/concise`)}
                  externalFile={externalFile}
                />
              </motion.div>

            </motion.div>
          ) : (
            <motion.div
              key="report"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-[#00ddff]">
              <button
                onClick={() => setActiveReportId(null)}
                className="mb-6 flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: "rgba(148,163,184,0.8)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "#60a5fa")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "rgba(148,163,184,0.8)")
                }
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to Upload
              </button>

              {isLoadingReport ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div
                    className="w-12 h-12 border-4 rounded-full animate-spin mb-4"
                    style={{ borderColor: "rgba(59,111,255,0.3)", borderTopColor: "#3b6fff" }}
                  />
                  <p className="font-medium" style={{ color: "rgba(148,163,184,0.8)" }}>
                    Loading report data...
                  </p>
                </div>
              ) : activeReport ? (
                <ReportView report={activeReport} />
              ) : (
                <div className="text-center py-20">
                  <p style={{ color: "rgba(148,163,184,0.7)" }}>Report not found.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <RegistrationModal
        open={showRegistration}
        onClose={() => setShowRegistration(false)}
        onSuccess={handleRegistrationSuccess}
        dismissible={isRegistered === true}
      />
      <OnboardingModal
        open={showOnboarding}
        onClose={closeOnboarding}
        onUpload={scrollToUpload}
        onConnectGmail={handleConnectGmail}
      />
      <button
        onClick={() => setShowOnboarding(true)}
        aria-label="Show app guide"
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{
          background: "linear-gradient(135deg, #3b6fff, #c084fc)",
          color: "#ffffff",
          boxShadow:
            "0 10px 30px -8px rgba(59,111,255,0.6), 0 0 0 1px rgba(255,255,255,0.08) inset",
        }}
        data-testid="button-help-onboarding"
      >
        <HelpCircle className="w-7 h-7" />
      </button>
    </div>
  );
}
