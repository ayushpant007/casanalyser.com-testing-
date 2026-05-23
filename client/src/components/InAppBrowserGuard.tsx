import { useState, useEffect } from "react";
import { ExternalLink, Copy, Check, Smartphone } from "lucide-react";

interface BrowserInfo {
  detected: boolean;
  name: string;
  isIOS: boolean;
  isAndroid: boolean;
  isLinkedIn: boolean;
  isFacebook: boolean;
  isInstagram: boolean;
}

function detectInAppBrowser(): BrowserInfo {
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const isLinkedIn = /LinkedInApp/i.test(ua);
  const isFacebook = /FBAN|FBAV|FB_IAB|FBIOS|FBDV/i.test(ua);
  const isInstagram = /Instagram/i.test(ua);
  const isTwitter = /Twitter(Android|iPhone)/i.test(ua);
  const isAndroidWebView = /\bwv\b/.test(ua) && isAndroid;
  const isIOSWebView =
    /AppleWebKit/i.test(ua) &&
    !/Safari/i.test(ua) &&
    !/CriOS/i.test(ua) &&
    !/FxiOS/i.test(ua) &&
    isIOS;

  let name = "";
  if (isLinkedIn) name = "LinkedIn";
  else if (isFacebook) name = "Facebook";
  else if (isInstagram) name = "Instagram";
  else if (isTwitter) name = "X (Twitter)";
  else if (isAndroidWebView || isIOSWebView) name = "an in-app browser";

  const detected = !!(
    isLinkedIn || isFacebook || isInstagram || isTwitter || isAndroidWebView || isIOSWebView
  );

  return { detected, name, isIOS, isAndroid, isLinkedIn, isFacebook, isInstagram };
}

function getInstructions(info: BrowserInfo): { steps: string[]; note?: string } {
  if (info.isIOS) {
    if (info.isLinkedIn) {
      return {
        steps: [
          'Tap  ···  in the top-right corner',
          'Select "Open in Safari"',
        ],
      };
    }
    if (info.isFacebook || info.isInstagram) {
      return {
        steps: [
          'Tap  ···  or  ⋮  in the top-right corner',
          'Select "Open in external browser" or "Open in Safari"',
        ],
      };
    }
    return {
      steps: [
        'Tap the share icon or  ···  menu',
        'Select "Open in Safari" or "Open in Chrome"',
      ],
    };
  }

  // Android — we can try the Chrome intent directly, so instructions are simpler
  return {
    steps: ['Tap "Open in Chrome" below', 'Or copy the link and paste it in Chrome'],
  };
}

export function InAppBrowserGuard() {
  const [info, setInfo] = useState<BrowserInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInfo(detectInAppBrowser());
  }, []);

  if (!info?.detected) return null;

  const url = window.location.href;
  const instructions = getInstructions(info);

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
    if (info.isAndroid) {
      window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    } else if (info.isIOS) {
      window.location.href = `googlechrome://${url.replace(/^https?:\/\//, "")}`;
    }
  };

  // On iOS, primary action is manual (can't redirect away from WebView reliably)
  // On Android, primary action is the Chrome intent
  const primaryIsOpenChrome = info.isAndroid;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 text-center"
      style={{
        background: "linear-gradient(160deg, #0a0f2e 0%, #0d1b12 60%, #0a0f2e 100%)",
      }}
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: "linear-gradient(135deg, #3b6fff22, #33f28922)",
          border: "1px solid rgba(51,242,137,0.3)",
        }}
      >
        <Smartphone className="w-9 h-9" style={{ color: "#33f289" }} />
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-bold text-white mb-2 leading-snug">
        Open in your browser
      </h1>
      <p className="text-white/60 text-sm mb-6 max-w-xs leading-relaxed">
        {info.name} blocks Google sign-in for security reasons. Follow these steps to continue:
      </p>

      {/* Step-by-step instructions */}
      <div
        className="w-full max-w-xs rounded-xl p-4 mb-6 text-left"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {instructions.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
            <span
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
              style={{ background: "rgba(51,242,137,0.2)", color: "#33f289" }}
            >
              {i + 1}
            </span>
            <p className="text-white/80 text-sm leading-snug">{step}</p>
          </div>
        ))}
      </div>

      {/* URL pill */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-xl mb-5 w-full max-w-xs"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <span className="text-white/50 text-xs truncate flex-1 text-left">{url}</span>
      </div>

      {/* Buttons — order based on platform */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {primaryIsOpenChrome ? (
          <>
            <button
              onClick={handleOpenChrome}
              className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #33f289 0%, #10b981 100%)",
                color: "#022c22",
                boxShadow: "0 8px 24px -6px rgba(51, 242, 137, 0.45)",
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Open in Chrome
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #33f289 0%, #10b981 100%)",
                color: "#022c22",
                boxShadow: "0 8px 24px -6px rgba(51, 242, 137, 0.45)",
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={handleOpenChrome}
              className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-95"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#ffffff",
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Try Open in Chrome
            </button>
          </>
        )}
      </div>

      <p className="text-white/30 text-xs mt-6 max-w-xs">
        {info.isAndroid
          ? 'If Chrome doesn\'t open, tap "Copy Link" and paste in Chrome.'
          : 'After copying, open Safari or Chrome and paste the link.'}
      </p>
    </div>
  );
}
