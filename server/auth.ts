import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

declare module "express-session" {
  interface SessionData {
    gmailUser?: {
      id: string;
      email: string;
      displayName?: string;
      accessToken: string;
      refreshToken?: string;
    };
  }
}

const CALLBACK_URL = "https://casanalyser.com/auth/callback";

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn("[auth] SESSION_SECRET is not set");
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("[auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set");
  }

  app.set("trust proxy", 1);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL: CALLBACK_URL,
      },
      (accessToken, refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value || "";
        return done(null, {
          id: profile.id,
          email,
          displayName: profile.displayName,
          accessToken,
          refreshToken,
        });
      },
    ),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
      accessType: "offline",
      prompt: "consent",
    }),
  );

  app.get(
    "/auth/callback",
    passport.authenticate("google", {
      failureRedirect: "/app?auth=failed",
      session: true,
    }),
    (req: Request, res: Response) => {
      const user = req.user as any;
      if (user && req.session) {
        req.session.gmailUser = {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
        };
      }
      res.redirect("/app?auth=success");
    },
  );

  app.get("/api/auth/me", (req: Request, res: Response) => {
    const gmailUser = req.session?.gmailUser;
    if (!gmailUser) {
      return res.json({ connected: false });
    }
    res.json({
      connected: true,
      email: gmailUser.email,
      displayName: gmailUser.displayName,
    });
  });

  const CAS_SENDERS = [
    "ecas@cdslstatement.com",
    "nsdl-cas@nsdl.co.in",
    "donotreply@camsonline.com",
  ];

  const SUBJECT_PATTERNS: { sender: string; patterns: RegExp[] }[] = [
    {
      sender: "ecas@cdslstatement.com",
      patterns: [
        /Consolidated\s+Account\s+Statement/i,
        /\bCAS\b/i,
        /CDSL/i,
      ],
    },
    {
      sender: "donotreply@camsonline.com",
      patterns: [
        /Consolidated\s+Account\s+Statement/i,
        /CAMS/i,
        /\bCAS\b/i,
      ],
    },
    {
      sender: "nsdl-cas@nsdl.co.in",
      patterns: [
        /Consolidated\s+Account\s+Statement/i,
        /\bCAS\b/i,
        /NSDL/i,
      ],
    },
  ];

  const BODY_KEYWORDS =
    /(consolidated\s+account\s+statement|\bCAS\b|\bNSDL\b|\bCDSL\b|\bCAMS\b|KFintech|mutual\s+fund|investments?|portfolio|password(\s+protected)?)/i;

  function decodeBase64Url(data: string): string {
    try {
      const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(b64, "base64").toString("utf8");
    } catch {
      return "";
    }
  }

  function extractBodyText(payload: any): string {
    let text = "";
    const walk = (part: any) => {
      if (!part) return;
      const mime: string = part.mimeType || "";
      const data: string | undefined = part.body?.data;
      if (data && (mime === "text/plain" || mime === "text/html")) {
        text += " " + decodeBase64Url(data).replace(/<[^>]+>/g, " ");
      }
      if (Array.isArray(part.parts)) part.parts.forEach(walk);
    };
    walk(payload);
    return text;
  }

  async function gmailFetch(accessToken: string, path: string) {
    const r = await fetch(`https://gmail.googleapis.com/gmail/v1${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) {
      throw new Error(`Gmail API error ${r.status}: ${await r.text()}`);
    }
    return r.json();
  }

  function findPdfAttachments(payload: any): { filename: string; attachmentId: string; size: number }[] {
    const out: { filename: string; attachmentId: string; size: number }[] = [];
    const walk = (part: any) => {
      if (!part) return;
      const filename: string = part.filename || "";
      const mime: string = part.mimeType || "";
      const attachmentId = part.body?.attachmentId;
      if (
        attachmentId &&
        (mime === "application/pdf" || filename.toLowerCase().endsWith(".pdf"))
      ) {
        out.push({ filename, attachmentId, size: part.body?.size || 0 });
      }
      if (Array.isArray(part.parts)) part.parts.forEach(walk);
    };
    walk(payload);
    return out;
  }

  app.get("/api/gmail/cas-pdfs", async (req: Request, res: Response) => {
    try {
      const user = req.session?.gmailUser;
      if (!user?.accessToken) {
        return res.status(401).json({ message: "Not connected" });
      }
      const fromQuery = CAS_SENDERS.map(s => `from:${s}`).join(" OR ");
      const q = encodeURIComponent(`(${fromQuery}) has:attachment filename:pdf`);
      const list = await gmailFetch(
        user.accessToken,
        `/users/me/messages?q=${q}&maxResults=100`,
      );
      const ids: string[] = (list.messages || []).map((m: any) => m.id);
      console.log(`[gmail] cas-pdfs: found ${ids.length} matching messages`);

      const results: any[] = [];
      for (const id of ids) {
        if (results.length >= 50) break;
        try {
          const msg = await gmailFetch(
            user.accessToken,
            `/users/me/messages/${id}?format=full`,
          );
          const headers: any[] = msg.payload?.headers || [];
          const getHeader = (n: string) =>
            headers.find((h: any) => h.name?.toLowerCase() === n.toLowerCase())?.value || "";
          const from = getHeader("From");
          const subject = getHeader("Subject");
          const dateHeader = getHeader("Date");
          const date = dateHeader || new Date(parseInt(msg.internalDate || "0", 10)).toISOString();
          const internalDate = parseInt(msg.internalDate || "0", 10);
          const fromLower = from.toLowerCase();
          const matchedSender = CAS_SENDERS.find((s) =>
            fromLower.includes(s.toLowerCase()),
          );
          if (!matchedSender) {
            console.log(`[gmail] reject ${id}: sender not allowed (${from})`);
            continue;
          }

          const subjectRules = SUBJECT_PATTERNS.find(
            (p) => p.sender.toLowerCase() === matchedSender.toLowerCase(),
          );
          const subjectOk =
            !!subjectRules &&
            subjectRules.patterns.some((re) => re.test(subject));
          if (!subjectOk) {
            console.log(
              `[gmail] reject ${id}: subject pattern mismatch ("${subject}")`,
            );
            continue;
          }

          const bodyText = extractBodyText(msg.payload) + " " + (msg.snippet || "");
          if (!BODY_KEYWORDS.test(bodyText)) {
            console.log(`[gmail] warn ${id}: body keywords missing (allowing through)`);
          }

          const attachments = findPdfAttachments(msg.payload);
          if (attachments.length === 0) {
            console.log(`[gmail] reject ${id}: no PDF attachment`);
            continue;
          }
          const att = attachments[0];
          results.push({
            messageId: id,
            attachmentId: att.attachmentId,
            filename: att.filename,
            size: att.size,
            from,
            subject,
            date,
            internalDate,
          });
        } catch (err) {
          console.error("[gmail] message fetch failed", id, err);
        }
      }

      results.sort((a, b) => b.internalDate - a.internalDate);
      const topResults = results.slice(0, 3);
      console.log(`[gmail] cas-pdfs: returning ${topResults.length} of ${results.length} matches`);
      res.json({ pdfs: topResults });
    } catch (err: any) {
      console.error("[gmail] cas-pdfs error", err);
      res.status(500).json({ message: err.message || "Failed to fetch Gmail" });
    }
  });

  app.get(
    "/api/gmail/attachment/:messageId/:attachmentId",
    async (req: Request, res: Response) => {
      try {
        const user = req.session?.gmailUser;
        if (!user?.accessToken) {
          return res.status(401).json({ message: "Not connected" });
        }
        const { messageId, attachmentId } = req.params;
        const filename =
          (req.query.filename as string) || `cas-${messageId}.pdf`;
        const data: any = await gmailFetch(
          user.accessToken,
          `/users/me/messages/${messageId}/attachments/${attachmentId}`,
        );
        const b64 = (data.data || "").replace(/-/g, "+").replace(/_/g, "/");
        const buf = Buffer.from(b64, "base64");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename.replace(/"/g, "")}"`,
        );
        res.send(buf);
      } catch (err: any) {
        console.error("[gmail] attachment error", err);
        res.status(500).json({ message: err.message || "Failed" });
      }
    },
  );

  app.post("/api/auth/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session?.destroy(() => {
        res.json({ success: true });
      });
    });
  });
}
