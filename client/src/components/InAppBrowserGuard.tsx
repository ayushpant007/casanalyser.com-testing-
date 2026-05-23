import { useState, useEffect } from "react";
import { ExternalLink, Copy, Check, Smartphone } from "lucide-react";

function detectInAppBrowser(): { detected: boolean; name: string } {
  const ua = navigator.userAgent || "";
  if (/LinkedInApp/i.test(ua)) return { detected: true, name: "LinkedIn" };
  if (/FBAN|FBAV|FB_IAB|FBIOS|FBDV/i.test(ua)) return { detected: true, name: "Facebook" };
  if (/Instagram/i.test(ua)) return { detected: true, name: "Instagram" };
  if (/Twitter(Android|iPhone)/i.test(ua)) return { detected: true, name: "X (Twitter)" };
  if (/\bwv\b/.test(ua) && /Android/i.test(ua)) return { detected: true, name: "an in-app browser" };
  if (
    /AppleWebKit/i.test(ua) &&
    !/Safari/i.test(ua) &&
    !/CriOS/i.test(ua) &&
    !/FxiOS/i.test(ua) &&
    /iPhone|iPad/i.test(ua)
  ) {
    return { detected: true, name: "an in-app browser" };
  }
  return { detected: false, name: "" };
}

export function InAppBrowserGuard() {
  const [info, setInfo] = useState<{ detected: boolean; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInfo(detectInAppBrowser());
  }, []);

  if (!info?.detected) return null;

  const url = window.location.href;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenChrome = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad/i.test(navigator.userAgent);
    if (isAndroid) {
      window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    } else if (isIOS) {
      window.location.href = `googlechrome://${url.replace(/^https?:\/\//, "")}`;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "linear-gradient(160deg, #0a0f2e 0%, #0d1b12 60%, #0a0f2e 100%)" }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(51,242,137,0.1)", border: "1px solid rgba(51,242,137,0.3)" }}
      >
        <Smartphone className="w-9 h-9" style={{ color: "#33f289" }} />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2 leading-snug">Open in your browser</h1>
      <p className="text-white/60 text-sm mb-1 max-w-xs leading-relaxed">
        {info.name} blocks Google sign-in for security reasons.
      </p>
      <p className="text-white/60 text-sm mb-8 max-w-xs leading-relaxed">
        Open this link in <strong className="text-white">Chrome</strong> or <strong className="text-white">Safari</strong> to continue.
      </p>
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-xl mb-6 w-full max-w-xs"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <span className="text-white/50 text-xs truncate flex-1 text-left">{url}</span>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg, #33f289 0%, #10b981 100%)",
            color: "#022c22",
            boxShadow: "0 8px 24px -6px rgba(51, 242, 137, 0.45)",
          }}
        >
          {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Copy className="w-4 h-4" />Copy Link</>}
        </button>
        <button
          onClick={handleOpenChrome}
          className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#ffffff" }}
        >
          <ExternalLink className="w-4 h-4" />
          Open in Chrome
        </button>
      </div>
      <p className="text-white/30 text-xs mt-8 max-w-xs">
        Tap "Copy Link", then paste it in Chrome or Safari's address bar.
      </p>
    </div>
  );
}
