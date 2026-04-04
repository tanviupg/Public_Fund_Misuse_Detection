import { useState, useEffect } from "react";
import { Search, Trash2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TransactionTable from "@/components/TransactionTable";
import { useTransactions } from "@/context/TransactionsContext";
import { useAuth } from "@/context/AuthContext";
import { updateTransactionStatus } from "@/api/api";
import { toast } from "@/components/ui/use-toast";

export default function HistoryPage() {
  const { history, loadingHistory, historyError, refreshHistory, clearHistory } = useTransactions();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [prediction, setPrediction] = useState("All");
  const [source, setSource] = useState("All");
  const [status, setStatus] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minRisk, setMinRisk] = useState("");
  const [maxRisk, setMaxRisk] = useState("");

  const buildParams = () => {
    const params: Record<string, any> = {};
    if (prediction !== "All") params.prediction = prediction;
    if (source !== "All") params.source = source;
    if (status !== "All") params.work_status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (minRisk) params.min_risk = Number(minRisk);
    if (maxRisk) params.max_risk = Number(maxRisk);
    if (search.trim()) params.q = search.trim();
    return params;
  };

  useEffect(() => {
    const t = setTimeout(() => {
      refreshHistory(buildParams()).catch(() => {});
    }, 300);

    return () => clearTimeout(t);
  }, [search, prediction, source, status, dateFrom, dateTo, minRisk, maxRisk, refreshHistory]);

  const handleClear = async () => {
    const ok = window.confirm("Clear all saved history? This cannot be undone.");
    if (!ok) return;
    try {
      await clearHistory();
      toast({ title: "History cleared", description: "All saved transactions were removed." });
    } catch (err: any) {
      toast({ title: "Clear failed", description: err?.message || "Unable to clear history." });
    }
  };

  const handleReviewUpdate = async (id: number, status: "Flagged" | "Cleared") => {
    try {
      await updateTransactionStatus(id, status);
      toast({ title: `Marked ${status}` });
      await refreshHistory();
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message || "Unable to update status." });
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshHistory(buildParams());
      toast({ title: "History refreshed", description: "Latest records loaded from the database." });
    } catch (err: any) {
      toast({ title: "Refresh failed", description: err?.message || "Unable to refresh history." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Transaction History</h2>
          <p className="text-muted-foreground">View and search all past transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={loadingHistory}>
            <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} /> Refresh
          </Button>
          {user?.role === "admin" && (
            <Button variant="destructive" className="gap-2" onClick={handleClear}>
              <Trash2 className="w-4 h-4" /> Clear History
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search (status, prediction, text)..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Select value={prediction} onValueChange={setPrediction}>
          <SelectTrigger>
            <SelectValue placeholder="Prediction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Predictions</SelectItem>
            <SelectItem value="Fraud">Fraud Only</SelectItem>
            <SelectItem value="Normal">Normal Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={source} onValueChange={setSource}>
          <SelectTrigger>
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Sources</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="csv">CSV Upload</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Work Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Work Status</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Incomplete">Incomplete</SelectItem>
          </SelectContent>
        </Select>

        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

        <Input type="number" min="0" max="100" placeholder="Min Risk %" value={minRisk} onChange={(e) => setMinRisk(e.target.value)} />
        <Input type="number" min="0" max="100" placeholder="Max Risk %" value={maxRisk} onChange={(e) => setMaxRisk(e.target.value)} />
      </div>

      {historyError && (
        <div className="rounded-xl border border-fraud/40 bg-fraud/10 p-4 text-sm text-fraud">
          {historyError}
        </div>
      )}

      <TransactionTable
        transactions={history}
        showDate
        showReview
        canReview={user?.role === "admin" || user?.role === "analyst"}
        onUpdateStatus={handleReviewUpdate}
      />

      {!loadingHistory && history.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No transactions found</div>
      )}

      {loadingHistory && (
        <div className="text-center py-8 text-muted-foreground">Loading history...</div>
      )}
    </div>
  );
}
