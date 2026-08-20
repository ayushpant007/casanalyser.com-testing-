# CAS Analyser

A focused portfolio-analysis product that turns a mutual-fund CAS (Consolidated Account Statement) PDF into a clearer view of an investor's holdings and allocation.

## What it does

- Accepts CAS documents from supported providers such as NSDL and CDSL
- Extracts holdings and portfolio data from uploaded PDFs
- Presents allocation and sub-category views in a visual dashboard
- Shows fund-level units, NAV, invested value, current value, and profit/loss
- Separates realised and unrealised performance where source data supports it
- Adapts analysis to an investor's risk profile and age band
- Keeps the workflow focused: upload, analyse, understand

## Product context

CAS Analyser is part of the Financial Friend product direction.

- Live product: [financialfriend.in](https://www.financialfriend.in/)
- Repository: [github.com/ayushpant007/casanalyser.com-testing-](https://github.com/ayushpant007/casanalyser.com-testing-)

## Technical highlights

- React and TypeScript frontend
- Express API server
- PostgreSQL with Drizzle ORM
- PDF and structured-data processing
- Google AI SDK integration for AI-assisted workflows
- Recharts and a component-driven UI for data-heavy views

## Run locally

Requirements: Node.js, npm, and PostgreSQL.

    npm install
    npm run dev

Useful scripts: npm run dev, npm run check, npm run build, and npm run start. Keep database and AI credentials in a local environment file; never commit them.

## Status

This is an actively developed product codebase. Product behaviour and supported document formats may evolve as parsing coverage and analysis workflows improve.
