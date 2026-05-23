import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InAppBrowserGuard } from "@/components/InAppBrowserGuard";

const Intro = lazy(() => import("@/pages/intro"));
const Home = lazy(() => import("@/pages/home"));
const ConciseReport = lazy(() => import("@/pages/ConciseReport"));
const CDSL = lazy(() => import("@/pages/cdsl"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const Contact = lazy(() => import("@/pages/contact"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080d20",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ animation: "spin 1s linear infinite" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
        <path d="M20 4 A16 16 0 0 1 36 20" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" />
        <defs>
          <linearGradient id="g" x1="20" y1="4" x2="36" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3b6fff" />
            <stop offset="1" stopColor="#9333ea" />
          </linearGradient>
        </defs>
      </svg>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, letterSpacing: "0.04em" }}>Loading…</span>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Intro} />
        <Route path="/app" component={Home} />
        <Route path="/cdsl" component={CDSL} />
        <Route path="/reports/:id/concise" component={ConciseReport} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/contact" component={Contact} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <InAppBrowserGuard />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
