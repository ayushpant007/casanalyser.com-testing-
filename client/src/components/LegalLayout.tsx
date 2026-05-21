import { useEffect, ReactNode } from "react";
import { Link } from "wouter";
import { FileText, Shield, Mail } from "lucide-react";
import casAnalyzerLogo from "@assets/ChatGPT_Image_Apr_23,_2026,_02_45_29_PM_1776935868469.png";

interface LegalLayoutProps {
  title: string;
  description: string;
  lastUpdated: string;
  children: ReactNode;
}

const navLinks = [
  { href: "/privacy", label: "Privacy Policy", icon: Shield },
  { href: "/terms", label: "Terms of Use", icon: FileText },
  { href: "/contact", label: "Contact Us", icon: Mail },
];

export function LegalLayout({ title, description, lastUpdated, children }: LegalLayoutProps) {
  useEffect(() => {
    document.title = `${title} | Cas Analyzer`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", description);
  }, [title, description]);

  return (
    <div className="min-h-screen flex flex-col bg-[#05060f] text-slate-100 font-sans">
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          background: "rgba(5,6,15,0.85)",
          borderColor: "rgba(96,165,250,0.15)",
        }}
        data-testid="header-legal"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/app"
            className="flex items-center gap-2 cursor-pointer"
            data-testid="link-home-logo"
          >
            <img
              src={casAnalyzerLogo}
              alt="Cas Analyzer"
              className="h-12 w-auto object-contain"
            />
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:text-blue-300"
                style={{ color: "rgba(148,163,184,0.9)" }}
                data-testid={`link-nav-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        {/* Mobile nav */}
        <nav className="sm:hidden border-t" style={{ borderColor: "rgba(96,165,250,0.15)" }}>
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-around">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-2 py-1.5 text-xs font-medium"
                style={{ color: "rgba(148,163,184,0.9)" }}
                data-testid={`link-mobile-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 w-full">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="mb-10">
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
              style={{
                background: "linear-gradient(90deg, #60a5fa, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              data-testid="text-page-title"
            >
              {title}
            </h1>
            <p
              className="text-sm"
              style={{ color: "rgba(148,163,184,0.7)" }}
              data-testid="text-last-updated"
            >
              Last updated: {lastUpdated}
            </p>
          </div>

          <article className="legal-content space-y-8 text-base leading-relaxed">
            {children}
          </article>
        </div>
      </main>

      <footer
        className="border-t mt-12"
        style={{
          background: "rgba(5,6,15,0.7)",
          borderColor: "rgba(96,165,250,0.15)",
        }}
        data-testid="footer-legal"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <img
                src={casAnalyzerLogo}
                alt="Cas Analyzer"
                className="h-10 w-auto object-contain"
              />
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm transition-colors hover:text-blue-300"
                  style={{ color: "rgba(148,163,184,0.85)" }}
                  data-testid={`link-footer-${l.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div
            className="mt-6 pt-6 border-t text-xs flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between"
            style={{
              borderColor: "rgba(96,165,250,0.1)",
              color: "rgba(148,163,184,0.6)",
            }}
          >
            <p>© {new Date().getFullYear()} Cas Analyzer. All rights reserved.</p>
            <p>
              Product by{" "}
              <a
                href="https://www.financialfriend.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-300 transition-colors"
              >
                Financial Friend
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="text-xl sm:text-2xl font-semibold"
        style={{ color: "#e2e8f0" }}
      >
        {heading}
      </h2>
      <div className="space-y-3" style={{ color: "rgba(203,213,225,0.85)" }}>
        {children}
      </div>
    </section>
  );
}
