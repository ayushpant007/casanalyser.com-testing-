import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  TrendingUp,
  Lock,
  Eye,
  Activity,
  FileText,
  Mail,
  HelpCircle,
  Upload,
  BarChart3,
  Lightbulb,
  IndianRupee,
  PieChart as PieChartIcon,
  AlertTriangle,
  Wallet,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Plus,
  Minus,
  Play,
} from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ShinyButton } from "@/components/ui/shiny-button";
import allocationImg from "@assets/image_1776920279232.png";
import categoryImg from "@assets/image_1776920296583.png";
import snapshotImg from "@assets/image_1776920332583.png";
import uploadImg from "@assets/image_1776920600846.png";
import demoVideo from "@assets/VN20260515_154759_compressed.mp4";
import { PieChart, Layers, Table2, UploadCloud, ChevronDown } from "lucide-react";

function DemoVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const activeRef = useRef(false); // guards against play/pause race

  const playVideo = async () => {
    const vid = videoRef.current;
    if (!vid || activeRef.current) return;
    activeRef.current = true;
    try {
      vid.muted = false;
      await vid.play();
      setPlaying(true);
    } catch {
      /* autoplay blocked or similar */
    } finally {
      activeRef.current = false;
    }
  };

  const pauseVideo = () => {
    const vid = videoRef.current;
    if (!vid || activeRef.current) return;
    activeRef.current = true;
    vid.pause();
    setPlaying(false);
    activeRef.current = false;
  };

  const togglePlay = () => {
    if (playing) pauseVideo();
    else playVideo();
  };

  return (
    <motion.section
      className="w-full max-w-4xl mx-auto mt-24"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7 }}
    >
      <div
        className="relative rounded-2xl overflow-hidden border"
        style={{
          borderColor: "rgba(96,165,250,0.3)",
          boxShadow: "0 0 60px -10px rgba(96,165,250,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
      >
        {/* Video element — NO click handler, overlays handle everything */}
        <video
          ref={videoRef}
          src={demoVideo}
          className="w-full block"
          playsInline
          loop
          preload="metadata"
          onEnded={() => setPlaying(false)}
        />

        {/* Play / Pause overlay — single unified control surface */}
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          style={{
            background: playing ? "transparent" : "rgba(5,10,30,0.55)",
            backdropFilter: playing ? "none" : "blur(2px)",
            pointerEvents: "auto",
            transition: "background 0.3s ease, backdrop-filter 0.3s ease",
          }}
          onClick={togglePlay}
        >
          {!playing && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,#3b6fff,#9333ea)",
                boxShadow: "0 0 40px rgba(59,111,255,0.6)",
              }}
            >
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

interface ShowcaseSectionProps {
  index: number;
  tag: string;
  tagIcon: React.ComponentType<{ className?: string }>;
  tagColor: string;
  title: string;
  desc: string;
  bullets: string[];
  image: string;
  align: "left" | "right";
}

function ShowcaseSection({
  index,
  tag,
  tagIcon: TagIcon,
  tagColor,
  title,
  desc,
  bullets,
  image,
  align,
}: ShowcaseSectionProps) {
  const imageOnLeft = align === "left";
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center"
      data-testid={`showcase-section-${index}`}
    >
      {/* Image */}
      <motion.div
        initial={{ opacity: 0, x: imageOnLeft ? -40 : 40, rotateY: imageOnLeft ? -8 : 8 }}
        whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        whileHover={{ y: -6, scale: 1.01 }}
        className={`relative ${imageOnLeft ? "md:order-1" : "md:order-2"}`}
        style={{ perspective: 1200 }}
      >
        <div
          className="absolute -inset-4 rounded-3xl blur-2xl opacity-40 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${tagColor}55, transparent 70%)`,
          }}
        />
        <div
          className="relative rounded-2xl overflow-hidden border shadow-2xl"
          style={{
            background: "rgba(8,12,30,0.7)",
            borderColor: `${tagColor}33`,
            boxShadow: `0 30px 80px -20px ${tagColor}40, 0 0 0 1px rgba(255,255,255,0.04) inset`,
          }}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-2 border-b"
            style={{
              background: "rgba(15,23,42,0.85)",
              borderColor: "rgba(96,165,250,0.15)",
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
            <span
              className="ml-3 text-[10px] tracking-wider"
              style={{ color: "rgba(148,163,184,0.6)" }}
            >
              casanalyser.com / report
            </span>
          </div>
          <img
            src={image}
            alt={title}
            className="w-full h-auto block"
            data-testid={`showcase-image-${index}`}
          />
        </div>
      </motion.div>

      {/* Copy */}
      <motion.div
        initial={{ opacity: 0, x: imageOnLeft ? 40 : -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        className={`${imageOnLeft ? "md:order-2" : "md:order-1"}`}
      >
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border mb-5 backdrop-blur-xl"
          style={{
            background: `${tagColor}15`,
            borderColor: `${tagColor}55`,
            color: tagColor,
          }}
        >
          <TagIcon className="w-3.5 h-3.5" />
          <span>{tag}</span>
          <span
            className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: `${tagColor}25` }}
          >
            0{index}
          </span>
        </div>
        <h3
          className="text-3xl md:text-4xl font-bold font-display tracking-tight leading-tight"
          style={{ color: "#ffffff" }}
        >
          {title}
        </h3>
        <p
          className="mt-4 text-base md:text-lg leading-relaxed"
          style={{ color: "rgba(226,232,240,0.95)" }}
        >
          {desc}
        </p>
        <ul className="mt-6 space-y-3">
          {bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-base"
              style={{ color: "rgba(241,245,249,0.95)" }}
            >
              <span
                className="mt-1 w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                style={{
                  background: `${tagColor}25`,
                  border: `1px solid ${tagColor}66`,
                }}
              >
                <Check className="w-3 h-3" style={{ color: tagColor }} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
}

function useTicker(target: number, duration = 1800) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

export default function Intro() {
  useEffect(() => {
    document.title = "CasAnalyser | AI Portfolio Analysis";
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    setMeta("description", "Analyze your CAS PDF with AI and get portfolio insights, allocation breakdowns, and recommendations.");
    setMeta("robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://casanalyser.com/");
  }, []);
  const [, navigate] = useLocation();
  const seconds = useTicker(10);
  const accuracy = useTicker(99);
  const [casTab, setCasTab] = useState<"cdsl" | "cams" | "nsdl">("cdsl");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleStart = () => navigate("/app");

  return (
    <div className="min-h-screen relative overflow-hidden font-sans bg-[#05060f]">
      <AnimatedBackground />

      {/* Aurora blobs (subtle) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(59,111,255,0.35), transparent 70%)",
          }}
          animate={{ x: [0, 60, -20, 0], y: [0, 40, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(192,132,252,0.28), transparent 70%)",
          }}
          animate={{ x: [0, -50, 30, 0], y: [0, -30, 50, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 left-1/3 w-[560px] h-[560px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(52,211,153,0.22), transparent 70%)",
          }}
          animate={{ x: [0, 40, -40, 0], y: [0, -50, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid overlay (very subtle) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <main className="relative z-10 min-h-screen flex flex-col items-center px-6 py-16">
        {/* ===================== HERO ===================== */}
        <section className="max-w-4xl w-full text-center pt-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border mb-6 backdrop-blur-xl"
            style={{
              background: "rgba(52,211,153,0.12)",
              borderColor: "rgba(52,211,153,0.4)",
              color: "#34d399",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            India's simplest portfolio analyser
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-bold font-display tracking-tight leading-[1.05]"
            style={{ color: "#ffffff" }}
            data-testid="text-intro-headline"
          >
            Understand your entire investment portfolio in
            <br />
            <span
              className="bg-clip-text text-transparent animate-gradient-shift"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #60a5fa, #c084fc, #f472b6, #34d399, #60a5fa)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
              }}
            >
              10 seconds
            </span>
            .
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            className="mt-6 text-base md:text-xl max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(226,232,240,0.95)" }}
            data-testid="text-intro-subheadline"
          >
            Upload your CAS (Consolidated Account Statement — your full
            investment report). We turn it into simple insights like{" "}
            <span className="text-white font-semibold">where your money is</span>,{" "}
            <span className="text-white font-semibold">risks</span>, and{" "}
            <span className="text-white font-semibold">hidden issues</span> —
            instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-4 inline-flex items-center gap-2 text-sm md:text-base px-4 py-2 rounded-full border"
            style={{
              background: "rgba(15,23,42,0.7)",
              borderColor: "rgba(96,165,250,0.3)",
              color: "rgba(226,232,240,0.95)",
            }}
            data-testid="text-cas-helper"
          >
            <HelpCircle className="w-4 h-4 text-blue-300" />
            <span>
              <span className="font-bold text-white">CAS</span> = All your
              mutual funds + stocks in one PDF
            </span>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65, ease: "easeOut" }}
            className="mt-9 flex flex-col items-center gap-3"
          >
            <ShinyButton
              onClick={handleStart}
              data-testid="button-get-started"
            >
              Upload CAS &amp; See My Portfolio
              <ArrowRight className="w-4 h-4" />
            </ShinyButton>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {[
                { icon: Eye, label: "No signup", tint: "#60a5fa" },
                { icon: Lock, label: "No data stored", tint: "#34d399" },
                { icon: Activity, label: `~${seconds}s analysis`, tint: "#c084fc" },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-xl"
                    style={{
                      background: "rgba(15,23,42,0.6)",
                      borderColor: "rgba(96,165,250,0.25)",
                      color: "#e2e8f0",
                    }}
                    data-testid={`hero-trust-${i}`}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: s.tint }} />
                    {s.label}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* 3-step flow */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-2 md:gap-4"
            data-testid="flow-3-step"
          >
            {[
              { icon: Upload, label: "Upload", tint: "#60a5fa" },
              { icon: BarChart3, label: "Analyze", tint: "#c084fc" },
              { icon: Lightbulb, label: "Get Insights", tint: "#34d399" },
            ].map((s, i, arr) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex items-center gap-2 md:gap-4">
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-xl"
                    style={{
                      background: "rgba(15,23,42,0.65)",
                      borderColor: `${s.tint}55`,
                    }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: `${s.tint}25`,
                        border: `1px solid ${s.tint}66`,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: s.tint }} />
                    </span>
                    <span className="text-sm md:text-base font-semibold text-white">
                      {s.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight
                      className="w-4 h-4 md:w-5 md:h-5"
                      style={{ color: "rgba(148,163,184,0.7)" }}
                    />
                  )}
                </div>
              );
            })}
          </motion.div>

          {/* Scroll prompt */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{
              opacity: { duration: 0.6, delay: 1.4 },
              y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
            }}
            className="mt-14 flex flex-col items-center gap-2"
            style={{ color: "rgba(203,213,225,0.85)" }}
            data-testid="scroll-indicator"
          >
            <span className="text-[10px] uppercase tracking-[0.3em]">
              Scroll to learn more
            </span>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </section>

        {/* ===================== DEMO VIDEO ===================== */}
        <DemoVideo />

        {/* ===================== WHAT IS CAS ===================== */}
        <section className="w-full max-w-6xl mx-auto mt-32" data-testid="section-what-is-cas">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 backdrop-blur-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(96,165,250,0.18), rgba(192,132,252,0.18))",
                borderColor: "rgba(96,165,250,0.5)",
                color: "#93c5fd",
                boxShadow: "0 0 30px rgba(96,165,250,0.25)",
              }}
            >
              <FileText className="w-3.5 h-3.5" />
              The basics
            </motion.div>
            <h2
              className="text-4xl md:text-6xl font-bold font-display tracking-tight"
              style={{ color: "#ffffff" }}
            >
              What is a{" "}
              <span
                className="bg-clip-text text-transparent animate-gradient-shift"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #60a5fa, #c084fc, #f472b6, #34d399, #60a5fa)",
                  backgroundSize: "200% 100%",
                  WebkitBackgroundClip: "text",
                }}
              >
                CAS
              </span>
              ?
            </h2>
            <div
              className="mx-auto mt-4 h-[3px] w-24 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #60a5fa, #c084fc, transparent)",
              }}
            />
          </motion.div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Visual illustration */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7 }}
              className="relative h-[380px] flex items-center justify-center"
            >
              {/* Glow */}
              <div
                className="absolute inset-0 rounded-full blur-3xl opacity-50"
                style={{
                  background:
                    "radial-gradient(circle, rgba(96,165,250,0.4), transparent 65%)",
                }}
              />

              {/* Central PDF card */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 w-44 h-56 rounded-2xl border-2 flex flex-col items-center justify-center backdrop-blur-xl"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))",
                  borderColor: "rgba(96,165,250,0.6)",
                  boxShadow:
                    "0 25px 60px -10px rgba(96,165,250,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset",
                }}
              >
                <div
                  className="absolute top-3 right-3 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider"
                  style={{
                    background: "rgba(244,63,94,0.2)",
                    border: "1px solid rgba(244,63,94,0.5)",
                    color: "#fda4af",
                  }}
                >
                  PDF
                </div>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(96,165,250,0.25), rgba(192,132,252,0.25))",
                    border: "1px solid rgba(96,165,250,0.5)",
                  }}
                >
                  <FileText className="w-8 h-8 text-blue-300" />
                </div>
                <div className="text-white font-bold text-base">CAS</div>
                <div
                  className="text-[10px] mt-1 font-medium tracking-wider uppercase"
                  style={{ color: "rgba(148,163,184,0.85)" }}
                >
                  Statement
                </div>
                {/* Mini lines (mock content) */}
                <div className="mt-3 space-y-1.5 w-3/4">
                  <div className="h-1 rounded-full bg-white/15" />
                  <div className="h-1 rounded-full bg-white/15 w-5/6" />
                  <div className="h-1 rounded-full bg-white/15 w-4/6" />
                </div>
              </motion.div>

              {/* Floating chips around the PDF */}
              {[
                {
                  label: "Mutual Funds",
                  icon: Wallet,
                  tint: "#34d399",
                  pos: "top-2 left-2",
                  delay: 0,
                },
                {
                  label: "Stocks",
                  icon: TrendingUp,
                  tint: "#60a5fa",
                  pos: "top-6 right-2",
                  delay: 0.5,
                },
                {
                  label: "NSDL",
                  icon: ShieldCheck,
                  tint: "#c084fc",
                  pos: "bottom-6 left-0",
                  delay: 1,
                },
                {
                  label: "CDSL",
                  icon: ShieldCheck,
                  tint: "#fbbf24",
                  pos: "bottom-4 right-4",
                  delay: 1.5,
                },
              ].map((chip, i) => {
                const Icon = chip.icon;
                return (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: chip.delay,
                    }}
                    className={`absolute ${chip.pos} z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-xl shadow-lg`}
                    style={{
                      background: `${chip.tint}20`,
                      borderColor: `${chip.tint}66`,
                      color: "#ffffff",
                      boxShadow: `0 8px 20px -4px ${chip.tint}55`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: chip.tint }} />
                    {chip.label}
                  </motion.div>
                );
              })}

              {/* Orbit ring (decorative) */}
              <div
                className="absolute inset-8 rounded-full border-2 border-dashed opacity-20"
                style={{ borderColor: "rgba(96,165,250,0.5)" }}
              />
            </motion.div>

            {/* Right: Description + cards */}
            <div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="text-base md:text-lg leading-relaxed mb-7"
                style={{ color: "rgba(226,232,240,0.95)" }}
              >
                A{" "}
                <span className="font-semibold text-white">
                  CAS (Consolidated Account Statement)
                </span>{" "}
                is a single PDF that shows all your investments — mutual funds,
                stocks, and more — across platforms like{" "}
                <span className="text-white font-semibold">NSDL</span> and{" "}
                <span className="text-white font-semibold">CDSL</span>.
              </motion.p>

              <div className="space-y-3">
                {[
                  {
                    icon: Mail,
                    title: "Comes monthly via email",
                    desc: "Auto-sent by NSDL, CDSL, CAMS or KFinTech.",
                    tint: "#60a5fa",
                  },
                  {
                    icon: HelpCircle,
                    title: "Hard to understand",
                    desc: "20+ pages of jargon-filled tables and codes.",
                    tint: "#fbbf24",
                  },
                  {
                    icon: Wallet,
                    title: "All your investments in one place",
                    desc: "Mutual funds + equities across every folio.",
                    tint: "#34d399",
                  },
                ].map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      whileHover={{ x: 4, scale: 1.01 }}
                      className="group relative flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-xl overflow-hidden cursor-default"
                      style={{
                        background: "rgba(15,23,42,0.7)",
                        borderColor: `${b.tint}40`,
                      }}
                      data-testid={`cas-bullet-${i}`}
                    >
                      {/* Hover glow */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{
                          background: `linear-gradient(90deg, ${b.tint}10, transparent)`,
                        }}
                      />
                      {/* Left accent bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ background: b.tint }}
                      />
                      <div
                        className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-6"
                        style={{
                          background: `${b.tint}25`,
                          border: `1px solid ${b.tint}66`,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: b.tint }} />
                      </div>
                      <div className="relative">
                        <p className="text-base font-bold text-white">
                          {b.title}
                        </p>
                        <p
                          className="text-sm mt-0.5"
                          style={{ color: "rgba(203,213,225,0.85)" }}
                        >
                          {b.desc}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom banner: "We simplify this completely" */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-14 relative mx-auto max-w-2xl"
          >
            <div
              className="absolute -inset-1 rounded-2xl blur-xl opacity-50"
              style={{
                background:
                  "linear-gradient(90deg, #60a5fa, #34d399, #c084fc)",
              }}
            />
            <div
              className="relative rounded-2xl border px-6 py-4 flex items-center justify-center gap-3 backdrop-blur-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,78,59,0.45))",
                borderColor: "rgba(52,211,153,0.55)",
              }}
            >
              <Sparkles className="w-5 h-5 text-emerald-300" />
              <span className="text-lg md:text-xl font-bold text-white">
                We simplify this{" "}
                <span className="text-emerald-300">completely.</span>
              </span>
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
          </motion.div>
        </section>

        {/* ===================== HOW TO GET YOUR CAS ===================== */}
        <section className="w-full max-w-5xl mx-auto mt-32" data-testid="section-how-to-get-cas">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 backdrop-blur-xl"
              style={{
                background: "rgba(251,191,36,0.12)",
                borderColor: "rgba(251,191,36,0.45)",
                color: "#fbbf24",
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              Step 0 — Before you begin
            </div>
            <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white">
              How to get your CAS PDF
            </h2>
            <p className="mt-4 text-base md:text-lg max-w-2xl mx-auto" style={{ color: "rgba(226,232,240,0.85)" }}>
              Not sure where to find your CAS? Pick your platform below — it takes under 2 minutes.
            </p>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex gap-2 mb-6 p-1 rounded-xl border w-fit mx-auto" style={{ background: "rgba(8,12,30,0.8)", borderColor: "rgba(96,165,250,0.2)" }}>
              {([
                { id: "cdsl", label: "CDSL", color: "#60a5fa" },
                { id: "cams", label: "CAMS / KFinTech", color: "#34d399" },
                { id: "nsdl", label: "NSDL", color: "#c084fc" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCasTab(t.id)}
                  data-testid={`cas-tab-${t.id}`}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={
                    casTab === t.id
                      ? { background: `${t.color}22`, color: t.color, border: `1px solid ${t.color}55` }
                      : { color: "rgba(148,163,184,0.8)", background: "transparent", border: "1px solid transparent" }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {casTab === "cdsl" && (
                <motion.div key="cdsl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                  <div className="rounded-2xl border p-6 md:p-8 backdrop-blur-xl" style={{ background: "rgba(15,23,42,0.7)", borderColor: "rgba(96,165,250,0.25)" }}>
                    <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
                      <div className="flex-1 space-y-4">
                        {[
                          { step: 1, text: "Go to", link: "https://www.cdslindia.com", linkText: "cdslindia.com", extra: "" },
                          { step: 2, text: 'Click "Generate CAS" and enter your PAN and your registered email / mobile', link: "", linkText: "", extra: "" },
                          { step: 3, text: 'Select "Detailed" as the statement type and pick your date range', link: "", linkText: "", extra: "" },
                          { step: 4, text: "Submit — the PDF will arrive in your email inbox within a few minutes", link: "", linkText: "", extra: "" },
                        ].map((s) => (
                          <div key={s.step} className="flex items-start gap-4">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "rgba(96,165,250,0.2)", border: "1px solid rgba(96,165,250,0.5)", color: "#93c5fd" }}>{s.step}</span>
                            <p className="text-base" style={{ color: "rgba(226,232,240,0.95)" }}>
                              {s.text}{" "}
                              {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline inline-flex items-center gap-1 hover:text-blue-300">{s.linkText} <ExternalLink className="w-3 h-3" /></a>}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="shrink-0 rounded-xl border p-4 w-full md:w-56" style={{ background: "rgba(96,165,250,0.08)", borderColor: "rgba(96,165,250,0.3)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#93c5fd" }}>PDF Password</p>
                        <p className="text-sm" style={{ color: "rgba(226,232,240,0.9)" }}>Your <strong className="text-white">PAN in capital letters</strong></p>
                        <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.75)" }}>e.g. if PAN is abcde1234f<br />password → <strong className="text-white">ABCDE1234F</strong></p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {casTab === "cams" && (
                <motion.div key="cams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                  <div className="rounded-2xl border p-6 md:p-8 backdrop-blur-xl" style={{ background: "rgba(15,23,42,0.7)", borderColor: "rgba(52,211,153,0.25)" }}>
                    <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
                      <div className="flex-1 space-y-4">
                        {[
                          { step: 1, text: "Go to", link: "https://www.camsonline.com/Investors/Statements/Consolidated-Account-Statement", linkText: "camsonline.com → CAS" },
                          { step: 2, text: "Enter your PAN and the email registered with your mutual funds", link: "", linkText: "" },
                          { step: 3, text: 'Choose "Detailed" statement, select your date range and click Submit', link: "", linkText: "" },
                          { step: 4, text: "You'll receive the password-protected PDF on your registered email within minutes", link: "", linkText: "" },
                        ].map((s) => (
                          <div key={s.step} className="flex items-start gap-4">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "rgba(52,211,153,0.2)", border: "1px solid rgba(52,211,153,0.5)", color: "#6ee7b7" }}>{s.step}</span>
                            <p className="text-base" style={{ color: "rgba(226,232,240,0.95)" }}>
                              {s.text}{" "}
                              {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline inline-flex items-center gap-1 hover:text-emerald-300">{s.linkText} <ExternalLink className="w-3 h-3" /></a>}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="shrink-0 rounded-xl border p-4 w-full md:w-56" style={{ background: "rgba(52,211,153,0.08)", borderColor: "rgba(52,211,153,0.3)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#6ee7b7" }}>PDF Password</p>
                        <p className="text-sm" style={{ color: "rgba(226,232,240,0.9)" }}>Your <strong className="text-white">PAN in capital letters</strong></p>
                        <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.75)" }}>e.g. if PAN is abcde1234f<br />password → <strong className="text-white">ABCDE1234F</strong></p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {casTab === "nsdl" && (
                <motion.div key="nsdl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                  <div className="rounded-2xl border p-6 md:p-8 backdrop-blur-xl" style={{ background: "rgba(15,23,42,0.7)", borderColor: "rgba(192,132,252,0.25)" }}>
                    <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
                      <div className="flex-1 space-y-4">
                        {[
                          { step: 1, text: "Go to", link: "https://eservices.nsdl.com", linkText: "eservices.nsdl.com" },
                          { step: 2, text: "Login or register with your PAN and Demat account details", link: "", linkText: "" },
                          { step: 3, text: 'Navigate to "Statement of Transaction" or "CAS" under the Services menu', link: "", linkText: "" },
                          { step: 4, text: "Select the date range, generate and download the statement. It may also arrive via email", link: "", linkText: "" },
                        ].map((s) => (
                          <div key={s.step} className="flex items-start gap-4">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5" style={{ background: "rgba(192,132,252,0.2)", border: "1px solid rgba(192,132,252,0.5)", color: "#d8b4fe" }}>{s.step}</span>
                            <p className="text-base" style={{ color: "rgba(226,232,240,0.95)" }}>
                              {s.text}{" "}
                              {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-purple-400 underline inline-flex items-center gap-1 hover:text-purple-300">{s.linkText} <ExternalLink className="w-3 h-3" /></a>}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="shrink-0 rounded-xl border p-4 w-full md:w-56" style={{ background: "rgba(192,132,252,0.08)", borderColor: "rgba(192,132,252,0.3)" }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#d8b4fe" }}>PDF Password</p>
                        <p className="text-sm" style={{ color: "rgba(226,232,240,0.9)" }}>Your <strong className="text-white">PAN in capital letters</strong></p>
                        <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.75)" }}>e.g. if PAN is abcde1234f<br />password → <strong className="text-white">ABCDE1234F</strong></p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-5 text-center text-sm" style={{ color: "rgba(148,163,184,0.75)" }}>
              Already have your CAS?{" "}
              <button onClick={handleStart} className="text-blue-400 underline hover:text-blue-300 font-medium">Upload it now →</button>
            </p>
          </motion.div>
        </section>

        {/* ===================== WHAT YOU GET ===================== */}
        <section className="w-full max-w-5xl mx-auto mt-32" data-testid="section-what-you-get">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-4"
              style={{
                background: "rgba(192,132,252,0.12)",
                borderColor: "rgba(192,132,252,0.4)",
                color: "#c084fc",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Outcomes
            </div>
            <h2
              className="text-3xl md:text-5xl font-bold font-display tracking-tight"
              style={{ color: "#ffffff" }}
            >
              What you'll get in 10 seconds
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              {
                icon: IndianRupee,
                title: "Total investment value",
                desc: "Your full portfolio in one number.",
                tint: "#34d399",
              },
              {
                icon: TrendingUp,
                title: "Profit / Loss across all funds",
                desc: "Know exactly what you've made or lost.",
                tint: "#60a5fa",
              },
              {
                icon: PieChartIcon,
                title: "Asset allocation",
                desc: "Equity, Debt, Gold — at a glance.",
                tint: "#c084fc",
              },
              {
                icon: ShieldCheck,
                title: "Portfolio risk level",
                desc: "Safe, balanced, or aggressive.",
                tint: "#fbbf24",
              },
              {
                icon: AlertTriangle,
                title: "Hidden concentration risks",
                desc: "Find funds quietly overlapping.",
                tint: "#f472b6",
              },
              {
                icon: Lightbulb,
                title: "Clear next steps",
                desc: "Know what to fix, hold, or trim.",
                tint: "#34d399",
              },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={i}
                  whileHover={{ y: -4, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="p-5 rounded-2xl border backdrop-blur-xl"
                  style={{
                    background: "rgba(15,23,42,0.65)",
                    borderColor: `${p.tint}33`,
                  }}
                  data-testid={`outcome-${i}`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{
                      background: `${p.tint}20`,
                      border: `1px solid ${p.tint}55`,
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: p.tint }} />
                  </div>
                  <div className="text-base font-semibold text-white">
                    {p.title}
                  </div>
                  <div
                    className="text-sm mt-1"
                    style={{ color: "rgba(203,213,225,0.85)" }}
                  >
                    {p.desc}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ===================== BEFORE vs AFTER ===================== */}
        <section className="w-full max-w-5xl mx-auto mt-32" data-testid="section-before-after">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-4"
              style={{
                background: "rgba(244,114,182,0.12)",
                borderColor: "rgba(244,114,182,0.4)",
                color: "#f472b6",
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              The shift
            </div>
            <h2
              className="text-3xl md:text-5xl font-bold font-display tracking-tight"
              style={{ color: "#ffffff" }}
            >
              Before vs After CasAnalyser
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Before */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="p-6 md:p-7 rounded-2xl border backdrop-blur-xl"
              style={{
                background: "rgba(31,15,15,0.6)",
                borderColor: "rgba(244,63,94,0.35)",
              }}
              data-testid="card-before"
            >
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(244,63,94,0.15)",
                    border: "1px solid rgba(244,63,94,0.4)",
                  }}
                >
                  <X className="w-5 h-5 text-rose-400" />
                </span>
                <h3 className="text-xl font-bold text-white">Before</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Confusing 20+ page PDF",
                  "No clarity on investments",
                  "Hidden risks you can't see",
                  "Hard to track performance",
                ].map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-base"
                    style={{ color: "rgba(241,245,249,0.95)" }}
                    data-testid={`before-${i}`}
                  >
                    <span className="mt-1 w-5 h-5 rounded-full flex items-center justify-center bg-rose-500/15 border border-rose-500/40 shrink-0">
                      <X className="w-3 h-3 text-rose-400" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* After */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-6 md:p-7 rounded-2xl border backdrop-blur-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,78,59,0.4))",
                borderColor: "rgba(52,211,153,0.45)",
                boxShadow: "0 10px 40px -10px rgba(16,185,129,0.25)",
              }}
              data-testid="card-after"
            >
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(52,211,153,0.2)",
                    border: "1px solid rgba(52,211,153,0.5)",
                  }}
                >
                  <Check className="w-5 h-5 text-emerald-400" />
                </span>
                <h3 className="text-xl font-bold text-white">After</h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Clean visual dashboard",
                  "Clear allocation across assets",
                  "Easy-to-understand insights",
                  "Instant analysis in seconds",
                ].map((b, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-base"
                    style={{ color: "rgba(241,245,249,0.95)" }}
                    data-testid={`after-${i}`}
                  >
                    <span className="mt-1 w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500/20 border border-emerald-400/50 shrink-0">
                      <Check className="w-3 h-3 text-emerald-300" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* ===================== EXISTING SHOWCASES (simpler wording) ===================== */}
        <div className="w-full max-w-6xl mx-auto mt-32 space-y-32">
          <ShowcaseSection
            index={1}
            tag="Built around you"
            tagIcon={UploadCloud}
            tagColor="#fbbf24"
            title="One upload. Your style. Your insights."
            desc="Tell us your investor type and age — Aggressive, Moderate or Conservative — and we'll show what your portfolio should look like for you."
            bullets={[
              "Drop your NSDL or CDSL CAS PDF",
              "Pick your risk style and age",
              "Get a personal report instantly",
            ]}
            image={uploadImg}
            align="left"
          />

          <ShowcaseSection
            index={2}
            tag="Where your money lives"
            tagIcon={PieChart}
            tagColor="#60a5fa"
            title="See exactly where your money is."
            desc="Get a clear picture of how your money is split across Equity, Debt, Hybrid and Gold — and whether your portfolio is balanced for someone like you."
            bullets={[
              "Know if your portfolio is balanced",
              "See where you are over-invested",
              "Get a simple health score out of 100",
            ]}
            image={allocationImg}
            align="right"
          />

          <ShowcaseSection
            index={3}
            tag="Hidden concentration"
            tagIcon={Layers}
            tagColor="#c084fc"
            title="Spot the risks before they hurt you."
            desc="Find out if too much of your money is sitting in one type of fund — like Mid Cap or Small Cap — without you realising it."
            bullets={[
              "Understand your risk clearly",
              "See which categories are too heavy",
              "Find empty buckets you should fill",
            ]}
            image={categoryImg}
            align="left"
          />

          <ShowcaseSection
            index={4}
            tag="Every fund, every gain"
            tagIcon={Table2}
            tagColor="#34d399"
            title="Every fund. Every fee. Every gain."
            desc="A clean, simple table of all your mutual fund holdings — what you invested, what it's worth today, and how much you've made or lost."
            bullets={[
              "Read straight from your CAS",
              "Know your true profit and loss",
              "A grand total you can trust",
            ]}
            image={snapshotImg}
            align="right"
          />
        </div>

        {/* ===================== TRUST: BUILT FOR INDIAN INVESTORS ===================== */}
        <section className="w-full max-w-5xl mx-auto mt-32" data-testid="section-trust">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border p-8 md:p-12 backdrop-blur-xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(30,41,59,0.6))",
              borderColor: "rgba(96,165,250,0.35)",
            }}
          >
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border mb-4"
                style={{
                  background: "rgba(52,211,153,0.12)",
                  borderColor: "rgba(52,211,153,0.4)",
                  color: "#34d399",
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Trust
              </div>
              <h2
                className="text-3xl md:text-4xl font-bold font-display tracking-tight"
                style={{ color: "#ffffff" }}
              >
                Built for Indian investors
              </h2>
              <p
                className="mt-4 text-base md:text-lg max-w-2xl mx-auto"
                style={{ color: "rgba(226,232,240,0.9)" }}
              >
                Made specifically for India's CAS formats. Your data stays yours.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: FileText,
                  title: "Works with NSDL & CDSL CAS",
                  tint: "#60a5fa",
                },
                {
                  icon: Wallet,
                  title: "Reads data from CAMS & KFinTech",
                  tint: "#c084fc",
                },
                {
                  icon: Eye,
                  title: "No login required",
                  tint: "#fbbf24",
                },
                {
                  icon: Lock,
                  title: "We do NOT store your data",
                  tint: "#34d399",
                },
              ].map((t, i) => {
                const Icon = t.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4 rounded-xl border"
                    style={{
                      background: "rgba(8,12,30,0.5)",
                      borderColor: `${t.tint}33`,
                    }}
                    data-testid={`trust-point-${i}`}
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `${t.tint}20`,
                        border: `1px solid ${t.tint}55`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: t.tint }} />
                    </span>
                    <span className="text-base font-medium text-white">
                      {t.title}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              className="mt-8 text-center text-sm"
              style={{ color: "rgba(148,163,184,0.85)" }}
            >
              <span className="font-bold text-white">{accuracy}%</span> fund
              accuracy · Live data from official AMC APIs
            </div>
          </motion.div>
        </section>

        {/* ===================== FAQ ===================== */}
        <section className="w-full max-w-3xl mx-auto mt-32" data-testid="section-faq">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border mb-5 backdrop-blur-xl"
              style={{
                background: "rgba(96,165,250,0.12)",
                borderColor: "rgba(96,165,250,0.45)",
                color: "#93c5fd",
              }}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              FAQ
            </div>
            <h2 className="text-3xl md:text-5xl font-bold font-display tracking-tight text-white">
              Common questions
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-3"
          >
            {[
              {
                q: "Is my data safe? Do you store my CAS PDF?",
                a: "No — we never store your PDF or personal data. Your file is processed in memory, the text is sent to the AI for analysis, and then deleted immediately. Nothing is saved to any database.",
              },
              {
                q: "What's the password for my CAS PDF?",
                a: "For all platforms — CDSL, NSDL, CAMS, and KFinTech — the password is your PAN in capital letters. For example, if your PAN is abcde1234f, the password will be ABCDE1234F.",
              },
              {
                q: "Which CAS formats are supported?",
                a: "We support all three major Indian CAS formats — CDSL (ecas.cdslindia.com), CAMS (camsonline.com), and NSDL (eservices.nsdl.com). Both NSDL and CDSL Demat statements work too.",
              },
              {
                q: "Is it free to use?",
                a: "Yes, completely free. No signup, no credit card, no hidden fees. Just upload your CAS and get your report instantly.",
              },
              {
                q: "I have investments on multiple platforms. Will it capture everything?",
                a: "Yes. A CAS (Consolidated Account Statement) already combines all your holdings — mutual funds from CAMS and KFinTech, plus equities from your Demat account — into one single PDF. Upload that one file and you get your full picture.",
              },
              {
                q: "How accurate is the analysis?",
                a: "Very accurate for mutual fund data. We read directly from official AMC APIs for live NAV and returns. The AI extraction of fund names, units, and values from your CAS typically matches the statement exactly.",
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-2xl border overflow-hidden backdrop-blur-xl"
                style={{
                  background: "rgba(15,23,42,0.7)",
                  borderColor: openFaq === i ? "rgba(96,165,250,0.4)" : "rgba(96,165,250,0.15)",
                }}
                data-testid={`faq-${i}`}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
                  data-testid={`faq-toggle-${i}`}
                >
                  <span className="text-base font-semibold text-white">{faq.q}</span>
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: openFaq === i ? "rgba(96,165,250,0.2)" : "rgba(96,165,250,0.08)",
                      border: "1px solid rgba(96,165,250,0.3)",
                    }}
                  >
                    {openFaq === i
                      ? <Minus className="w-3.5 h-3.5 text-blue-300" />
                      : <Plus className="w-3.5 h-3.5 text-blue-300" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div
                        className="px-6 pb-5 text-base leading-relaxed"
                        style={{ color: "rgba(203,213,225,0.9)", borderTop: "1px solid rgba(96,165,250,0.12)" }}
                      >
                        <div className="pt-4">{faq.a}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ===================== FINAL CTA ===================== */}
        <div className="w-full max-w-6xl mx-auto mt-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7 }}
            className="relative rounded-3xl border overflow-hidden p-10 md:p-16 text-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(59,111,255,0.18), rgba(192,132,252,0.12) 50%, rgba(52,211,153,0.15))",
              borderColor: "rgba(96,165,250,0.3)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-3xl opacity-40 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(96,165,250,0.6), transparent 70%)",
              }}
            />
            <h2
              className="text-3xl md:text-5xl font-bold font-display tracking-tight"
              style={{ color: "#ffffff" }}
              data-testid="text-final-cta-headline"
            >
              Your CAS PDF is confusing.
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #60a5fa, #c084fc, #34d399)",
                  WebkitBackgroundClip: "text",
                }}
              >
                Let's make it simple.
              </span>
            </h2>
            <p
              className="mt-5 text-base md:text-lg max-w-xl mx-auto"
              style={{ color: "rgba(226,232,240,0.95)" }}
            >
              Free. Private. No signup. Takes less than 10 seconds.
            </p>
            <div className="mt-8 flex justify-center">
              <ShinyButton
                onClick={handleStart}
                data-testid="button-final-cta"
              >
                Upload CAS &amp; Analyze Now
                <ArrowRight className="w-4 h-4" />
              </ShinyButton>
            </div>
          </motion.div>
        </div>

        {/* ===================== FOOTER ===================== */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 mb-4 text-xs flex flex-wrap items-center justify-center gap-2"
          style={{ color: "rgba(203,213,225,0.7)" }}
          data-testid="text-intro-footer"
        >
          <span
            className="w-1 h-1 rounded-full"
            style={{ background: "#34d399" }}
          />
          <span>
            CasAnalyser · Product by{" "}
            <a
              href="https://www.financialfriend.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-blue-300 transition-colors"
              data-testid="link-financial-friend"
            >
              Financial Friend
            </a>
          </span>
          <span style={{ color: "rgba(148,163,184,0.4)" }}>·</span>
          <a
            href="/privacy"
            className="hover:text-blue-300 transition-colors"
            data-testid="link-intro-privacy"
          >
            Privacy
          </a>
          <span style={{ color: "rgba(148,163,184,0.4)" }}>·</span>
          <a
            href="/terms"
            className="hover:text-blue-300 transition-colors"
            data-testid="link-intro-terms"
          >
            Terms
          </a>
          <span style={{ color: "rgba(148,163,184,0.4)" }}>·</span>
          <a
            href="/contact"
            className="hover:text-blue-300 transition-colors"
            data-testid="link-intro-contact"
          >
            Contact
          </a>
        </motion.div>
      </main>

      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 6s linear infinite;
        }
      `}</style>
    </div>
  );
}
