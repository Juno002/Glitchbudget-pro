# **App Name**: Glitchbudget

> Documento de origen conservado como referencia histórica. El contrato vigente hasta Fase 13 se rige por [Roadmap: documentación vigente](roadmap/README.md), [arquitectura UX](ux/architecture.md) y [sistema de diseño](ux/design-system.md). Las reglas visuales originales del final de este archivo no sustituyen el sistema de diseño actual.

## Core Features (current through Phase 13):

- Income Recording: Record income transactions with descriptions and amounts.
- Expense Recording: Record expense transactions with descriptions, amounts, and categories.
- Transaction Categorization: Categorize transactions (e.g., food, transportation, utilities).
- Balance Visualization: Display the current balance, showing available funds.
- Budget Planning: Set category limits for weekly, monthly, yearly, or one-time date ranges through one Period Engine. Each range exposes limit, spent, remaining, percentage, and status, and overlapping limits never duplicate the underlying expense.
- Goal Planning: Create targets with optional deadlines and explicit contributions. Saved progress is derived from contribution history, and the required monthly contribution is calculated from the remaining target and financial periods. Goal contributions are planning reservations and do not move account balances.
- Budget Rollover and Reassignment: Weekly, monthly, and yearly limits can apply the configured rollover policy. Reassignment changes planned limits within the same range; it is not a bank transfer.
- Currency Foundation: A configured base currency and explicit account currency preserve monetary meaning. Existing accounts migrate to the configured base without automatic conversion; remote FX is not used and cross-currency transfers remain blocked until a manual-rate workflow exists.
- Investments 1.0: Certificates, term deposits and known-yield products are non-liquid assets backed by investment accounts. Funding is an internal asset transfer, existing holdings use an opening value, and projected interest never enters actual net worth.
- Reports 2.0: Shared pure selectors provide Spending, Cash Flow, Net Worth and comparable-period analysis over 7D, 30D, 3M, 6M, 1Y and custom ranges. Home and Reports consume the same financial selector contract.
- Transaction History: View and filter past transactions.
- Summary Dashboard: Local summaries based on recorded transactions.

## Style Guidelines (historical origin)

The fixed colors below belong to the initial brief. Current themes and component tokens are defined in [the design system](ux/design-system.md).

- Background color: Light gray-blue (#E0EAF5) for a calm, neutral backdrop.
- Primary color: Blue (#3498db) for a clean, trustworthy feel.
- Accent color: Red (#e74c3c) to highlight important alerts or over-budget spending.
- Font pairing: 'Inter' (sans-serif) for body and 'PT Sans' (sans-serif) for headings.
- Use clear, minimalist icons to represent transaction categories.
- A clean, straightforward layout that clearly presents financial information.
- Subtle transitions when navigating between different sections of the app.