import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useEffect } from "react";

export default function CDSL() {
  const [, navigate] = useLocation();
  const externalUrl = "https://cdslnsdl-cas.replit.app";
  useEffect(() => {
    document.title = "CDSL CAS Analyzer | CasAnalyser";
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <header className="shrink-0 border-b px-6 py-4 bg-card text-card-foreground">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">CDSL CAS Analyzer</h1>
          <Button variant="outline" onClick={() => navigate("/")} data-testid="button-back-home">
            Back to Home
          </Button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold">Open the CDSL CAS Analyzer</h2>
          <p className="text-sm text-muted-foreground">
            The CDSL analyzer opens in a new tab.
          </p>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:opacity-90 transition"
            data-testid="link-cdsl-open"
          >
            Open CDSL Analyzer
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </main>
    </div>
  );
}
