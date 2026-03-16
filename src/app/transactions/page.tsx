// THIS PAGE IS DEPRECATED AND WILL BE REMOVED
// Functionality is now in a tab within the main dashboard.
import AppShell from "@/components/layout/app-shell";
import TransactionHistoryClient from "@/components/transactions/transaction-history-client";

export default function TransactionsPage() {
  return (
    <AppShell>
        <TransactionHistoryClient />
    </AppShell>
  );
}
