import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  X,
  Upload,
  ShieldCheck,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { ShinyButton } from "@/components/ui/shiny-button";
import casExplainerImg from "@assets/ChatGPT_Image_Apr_23,_2026,_11_18_28_AM_1776923314610.png";
import uploadExplainerImg from "@assets/ChatGPT_Image_Apr_23,_2026,_10_55_45_AM_1776921962761.png";
import gmailExplainerImg from "@assets/ChatGPT_Image_Apr_23,_2026,_10_59_57_AM_1776922207998.png";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: () => void;
  onConnectGmail: () => void;
}

const TOTAL_SLIDES = 3;

export function OnboardingModal({
  open,
  onClose,
  onUpload,
  onConnectGmail,
}: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && step < TOTAL_SLIDES - 1) {
        setDirection(1);
        setStep((s) => s + 1);
      }
      if (e.key === "ArrowLeft" && step > 0) {
        setDirection(-1);
        setStep((s) => s - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, onClose]);

  const next = () => {
    if (step < TOTAL_SLIDES - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      onClose();
    }
  };
  const prev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const handleUpload = () => {
    onClose();
    onUpload();
  };
  const handleGmail = () => {
    onClose();
    onConnectGmail();
  };

  const slides = [
    {
      title: "What is a CAS Report?",
      subtitle:
        "A CAS (Consolidated Account Statement) is a single document that contains all your mutual fund and investment details — issued monthly by NSDL, CDSL or CAMS.",
      hideText: true,
      visual: (
        <ImageFrame tint="#c084fc" tall>
          <img
            src={casExplainerImg}
            alt="What is a CAS Report illustration"
            className="w-full h-full object-contain"
            data-testid="image-onboarding-cas-explainer"
          />
        </ImageFrame>
      ),
    },
    {
      title: "Already Have Your CAS?",
      subtitle:
        "You can directly upload your CAS PDF file to get started instantly.",
      visual: (
        <ImageFrame tint="#34d399" tall>
          <img
            src={uploadExplainerImg}
            alt="Upload your CAS illustration"
            className="w-full h-full object-contain"
            data-testid="image-onboarding-upload-explainer"
          />
        </ImageFrame>
      ),
      primary: {
        label: "Upload CAS",
        icon: Upload,
        onClick: handleUpload,
      },
      hideText: true,
    },
    {
      title: "Don't Have Your CAS?",
      subtitle:
        "No worries! Connect your Gmail and we'll securely fetch your CAS if it's available in your inbox.",
      visual: (
        <ImageFrame tint="#f472b6" tall>
          <img
            src={gmailExplainerImg}
            alt="Connect Gmail illustration"
            className="w-full h-full object-contain"
            data-testid="image-onboarding-gmail-explainer"
          />
        </ImageFrame>
      ),
      primary: {
        label: "Connect Gmail",
        icon: SiGoogle,
        onClick: handleGmail,
      },
      hideText: true,
    },
  ];

  const slide = slides[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{
            background: "rgba(2,6,23,0.75)",
            backdropFilter: "blur(8px)",
          }}
          onClick={onClose}
          data-testid="onboarding-overlay"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl border overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,20,50,0.95), rgba(8,12,30,0.97))",
              borderColor: "rgba(96,165,250,0.25)",
              boxShadow:
                "0 30px 80px -20px rgba(59,111,255,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset",
            }}
            data-testid="onboarding-modal"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: "rgba(203,213,225,0.7)" }}
              aria-label="Close"
              data-testid="button-onboarding-close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 pt-6">
              {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > step ? 1 : -1);
                    setStep(i);
                  }}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === step ? 24 : 8,
                    background:
                      i === step
                        ? "linear-gradient(90deg, #60a5fa, #c084fc)"
                        : "rgba(96,165,250,0.25)",
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                  data-testid={`dot-onboarding-${i}`}
                />
              ))}
            </div>

            {/* Slide */}
            <div className="px-8 pt-6 pb-2 min-h-[420px] flex flex-col">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 30 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex-1 flex flex-col items-center text-center"
                >
                  {slide.visual}
                  {!slide.hideText && (
                    <>
                      <h2
                        className="mt-7 text-2xl md:text-[26px] font-bold font-display tracking-tight"
                        style={{ color: "#f8fafc" }}
                        data-testid={`text-onboarding-title-${step}`}
                      >
                        {slide.title}
                      </h2>
                      <p
                        className="mt-3 text-sm md:text-[15px] leading-relaxed max-w-md"
                        style={{ color: "rgba(203,213,225,0.85)" }}
                        data-testid={`text-onboarding-subtitle-${step}`}
                      >
                        {slide.subtitle}
                      </p>
                    </>
                  )}

                  {/* Slide-specific primary action */}
                  {slide.primary && (
                    <div className="mt-6">
                      <ShinyButton
                        onClick={slide.primary.onClick}
                        data-testid={`button-onboarding-primary-${step}`}
                      >
                        <slide.primary.icon className="w-4 h-4" />
                        {slide.primary.label}
                      </ShinyButton>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            <div
              className="flex items-center justify-between px-6 py-4 border-t"
              style={{ borderColor: "rgba(96,165,250,0.15)" }}
            >
              <button
                onClick={prev}
                disabled={step === 0}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
                style={{ color: "rgba(203,213,225,0.85)" }}
                data-testid="button-onboarding-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div
                className="flex items-center gap-2"
                data-testid="onboarding-counter"
              >
                <div className="relative w-9 h-9">
                  <svg
                    className="w-9 h-9 -rotate-90"
                    viewBox="0 0 36 36"
                    aria-hidden="true"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="rgba(96,165,250,0.18)"
                      strokeWidth="2.5"
                    />
                    <motion.circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="url(#counterGrad)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 15}
                      initial={false}
                      animate={{
                        strokeDashoffset:
                          2 * Math.PI * 15 *
                          (1 - (step + 1) / TOTAL_SLIDES),
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                    <defs>
                      <linearGradient
                        id="counterGrad"
                        x1="0"
                        y1="0"
                        x2="36"
                        y2="36"
                      >
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={step}
                      initial={{ opacity: 0, scale: 0.6, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6, y: -4 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0 flex items-center justify-center text-[11px] font-bold"
                      style={{ color: "#f1f5f9" }}
                    >
                      {step + 1}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
              {step < TOTAL_SLIDES - 1 ? (
                <button
                  onClick={next}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:scale-[1.03]"
                  style={{
                    background: "linear-gradient(135deg, #3b6fff, #c084fc)",
                    color: "#ffffff",
                  }}
                  data-testid="button-onboarding-next"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-all hover:scale-[1.03]"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#f1f5f9",
                  }}
                  data-testid="button-onboarding-done"
                >
                  Done
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ImageFrame({
  tint,
  children,
  tall = false,
}: {
  tint: string;
  children: React.ReactNode;
  tall?: boolean;
}) {
  return (
    <div
      className={`relative w-full ${tall ? "h-[420px] md:h-[480px]" : "h-64 md:h-72"} rounded-2xl border overflow-hidden`}
      style={{
        background: "rgba(8,12,30,0.6)",
        borderColor: `${tint}55`,
        boxShadow: `0 20px 60px -20px ${tint}66`,
      }}
    >
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-32 rounded-full blur-3xl opacity-50 pointer-events-none z-0"
        style={{ background: tint }}
      />
      <div className="relative w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function IllustrationFrame({
  tint,
  children,
}: {
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative w-full h-40 rounded-2xl border flex items-center justify-center overflow-hidden"
      style={{
        background: "rgba(8,12,30,0.6)",
        borderColor: `${tint}33`,
      }}
    >
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-50"
        style={{ background: tint }}
      />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `linear-gradient(${tint}88 1px, transparent 1px), linear-gradient(90deg, ${tint}88 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function FloatIcon({
  children,
  delay,
  color,
}: {
  children: React.ReactNode;
  delay: number;
  color: string;
}) {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className="w-14 h-14 rounded-2xl border flex items-center justify-center"
      style={{
        background: `${color}20`,
        borderColor: `${color}55`,
        color,
        boxShadow: `0 10px 30px -10px ${color}80`,
      }}
    >
      {children}
    </motion.div>
  );
}
