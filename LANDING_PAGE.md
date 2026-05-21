# CasAnalyser — Landing Page

> **Product by Financial Friend**
> Live route: `/`
> Source file: `client/src/pages/intro.tsx`

---

## 1. Hero Section

### Headline
**Stop guessing.**
**Start knowing.**

> *"Start knowing." renders in an animated gradient (blue → purple → pink → green → blue) with a blinking cursor next to it.*

### Sub-headline
Upload your CAS. We break down every fund, fee, and hidden risk
**in seconds.**

### Live Stats Strip
| Icon | Value | Label |
|------|-------|-------|
| ⚡ Activity | ~8s | avg analysis |
| 📈 TrendingUp | 99% | fund accuracy |
| 🔒 Lock | 0 | data stored |

> *Numbers tick up from 0 to their target on page load.*

### Primary CTA
**[ Get Started → ]**
*(Shiny button — navigates to `/app`)*

> 👁 No signup. No card. Just upload & go.

---

## 2. Trust Strip — "Reads statements from"

A horizontally scrolling marquee of supported sources:

```
NSDL · CDSL · CAMS · KFinTech · Mutual Funds · Equities
```

---

## 3. Three Value Pillars

| Icon | Title | Description |
|------|-------|-------------|
| ⚡ Zap | **Instant X-Ray** | Decode your CAS in seconds. |
| ✨ Sparkles | **AI-Powered Insights** | Hidden risks, clearly explained. |
| 🛡️ ShieldCheck | **Private & Secure** | Your data never leaves your control. |

> *Each card has a soft glow that intensifies on hover.*

**Scroll prompt:** ⌄ *Scroll to explore*

---

## 4. Showcase Sections (Feature Storytelling)

Each section alternates image-left / image-right and is presented inside a stylized "browser-frame" preview.

---

### Section 01 — Asset Allocation X-Ray
**Tag:** 🟦 *Asset allocation X-Ray*

**Headline:** *Know exactly where your money lives.*

**Description:**
See ideal vs current allocation across **Equity, Debt, Hybrid, Gold/Silver** — with a portfolio health score and a clear list of what's over, under, or on target.

**Highlights:**
- Health score out of 100
- Ideal vs current pie comparison
- Per-category deviation table

---

### Section 02 — Category-Wise Distribution
**Tag:** 🟪 *Category-wise distribution*

**Headline:** *Drill into every fund category.*

**Description:**
Break down Equity into **Mid Cap, Large Cap, Small Cap, ELSS** — and Debt into **Low Duration, Savings** and more. Spot concentration before it bites you.

**Highlights:**
- Sub-category weight bars
- Dominant vs On-target tags
- Hidden empty buckets surfaced

---

### Section 03 — Portfolio Snapshot
**Tag:** 🟢 *Portfolio Snapshot*

**Headline:** *Every fund. Every fee. Every gain.*

**Description:**
A clean, line-by-line snapshot of all your mutual fund units — **units, NAV, invested, current value, and P/L** — with a Grand Total you can actually trust.

**Highlights:**
- Pulled directly from CAS
- Realised vs unrealised P/L
- Grand Total reconciled to the rupee

---

### Section 04 — Tailored to You
**Tag:** 🟡 *Tailored to you*

**Headline:** *One upload. Your style. Your insights.*

**Description:**
Pick your investor type and age band — **Aggressive, Moderate** or **Conservative** — and the analysis adapts to what an ideal portfolio for you should look like.

**Highlights:**
- Drop NSDL or CDSL CAS PDFs
- Choose risk profile + age band
- Get a personalised X-Ray instantly

---

## 5. Final CTA Block

### Headline
**Your CAS PDF is hiding things.**
*Let's pull them out.*

> *"Let's pull them out." in a blue → purple → green gradient.*

### Sub-line
Free. Private. No signup. Takes less than 10 seconds.

### Button
**[ Analyze My Portfolio → ]**

---

## 6. Footer

```
● CasAnalyser · Product by Financial Friend · Privacy · Terms · Contact
```

| Link | URL |
|------|-----|
| Financial Friend | https://www.financialfriend.in/ |
| Privacy | `/privacy` |
| Terms | `/terms` |
| Contact | `/contact` |

---

## 7. Visual & Motion Notes

| Element | Behaviour |
|---------|-----------|
| **Background** | Dark navy (`#05060f`) with an animated starfield (`AnimatedBackground`) |
| **Aurora blobs** | Three large floating gradient blobs (blue, purple, green) drifting on infinite loops |
| **Grid overlay** | Subtle blue grid mask, fading at the edges |
| **Headline gradient** | 5-color animated text (blue → purple → pink → green → blue), 6s loop |
| **Provider strip** | Marquee scrolling left, 22s loop |
| **Cards** | Glass-morphism: `rgba(15,23,42,0.55)` with backdrop blur and colored borders |
| **Hover** | Cards lift and scale slightly; glow intensifies |
| **Showcase entry** | Slides in from the side with a slight 3D rotate-Y on the image |
| **Final CTA** | Multi-color gradient panel with a top-light radial glow |

---

## 8. Color Palette

| Purpose | Color |
|---------|-------|
| Background | `#05060f` |
| Primary text | `#f8fafc` |
| Muted text | `rgba(203,213,225,0.85)` |
| Accent — Blue | `#60a5fa` |
| Accent — Purple | `#c084fc` |
| Accent — Pink | `#f472b6` |
| Accent — Green | `#34d399` |
| Accent — Amber | `#fbbf24` |

---

## 9. Page Goals

1. Convert visitors to upload a CAS by clearly answering *"What do I get?"* in under 5 seconds.
2. Establish trust through supported-provider names (NSDL, CDSL, CAMS, KFinTech) and the "0 data stored" stat.
3. Showcase the actual product UI (allocation pies, category bars, snapshot table) so users *see* the deliverable before clicking.
4. Reinforce **free + no-signup** so the bounce rate stays low.
5. Funnel everything to the same primary action: **Analyze My Portfolio** (`/app`).
