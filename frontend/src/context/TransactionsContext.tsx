import { createContext, useContext, useMemo, useState, useEffect, useCallback, type ReactNode } from "react";
import { getHistory, clearHistory as apiClearHistory } from "@/api/api";
import { useAuth } from "@/context/AuthContext";

export interface Transaction {
  id: number;
  allocated_amount: number;
  spent_amount: number;
  work_status: "Completed" | "Incomplete";
  prediction: "Fraud" | "Normal";
  date: string;
  source?: "manual" | "csv";
  risk_score?: number;
  explanation?: string[];
  input_payload?: Record<string, any>;
  review_status?: "Unreviewed" | "Flagged" | "Cleared";
  user_name?: string;
  user_role?: string;
}

export interface LatestResult {
  prediction: "Fraud" | "Normal";
  input: {
    allocated_amount: number;
    spent_amount: number;
    work_status: "Completed" | "Incomplete";
  };
}

export interface HistoryQuery {
  limit?: number;
  offset?: number;
  prediction?: "Fraud" | "Normal";
  source?: "manual" | "csv";
  work_status?: "Completed" | "Incomplete";
  date_from?: string;
  date_to?: string;
  min_risk?: number;
  max_risk?: number;
  q?: string;
}

interface TransactionsContextValue {
  history: Transaction[];
  latestResult: LatestResult | null;
  loadingHistory: boolean;
  historyError: string;
  refreshHistory: (params?: HistoryQuery) => Promise<Transaction[]>;
  clearHistory: () => Promise<void>;
  setLatestResult: (r: LatestResult | null) => void;
}

const TransactionsContext = createContext<TransactionsContextValue | undefined>(undefined);

const normalizeHistory = (rows: any[]): Transaction[] => {
  return (rows || []).map((row) => {
    const statusRaw = String(row.work_status ?? "Completed");
    const status = statusRaw.toLowerCase().includes("incomp") ? "Incomplete" : "Completed";
    return {
      id: Number(row.id),
      allocated_amount: Number(row.allocated_amount) || 0,
      spent_amount: Number(row.spent_amount) || 0,
      work_status: status,
      prediction: row.prediction === "Fraud" ? "Fraud" : "Normal",
      date: row.created_at || row.date || new Date().toISOString(),
      source: row.source,
      risk_score: row.risk_score != null ? Number(row.risk_score) : undefined,
      explanation: Array.isArray(row.explanation) ? row.explanation : [],
      input_payload: row.input_payload || undefined,
      review_status: row.review_status || "Unreviewed",
      user_name: row.user_name || undefined,
      user_role: row.user_role || undefined,
    };
  });
};

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const { user, token, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<Transaction[]>([]);
  const [latestResult, setLatestResult] = useState<LatestResult | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const refreshHistory = useCallback(async (params: HistoryQuery = {}) => {
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const data = await getHistory(params);
      const normalized = normalizeHistory(data);
      setHistory(normalized);
      return normalized;
    } catch (err: any) {
      const message = err?.message || "Failed to load history.";
      setHistoryError(message);
      throw err;
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError("");
    try {
      await apiClearHistory();
      setHistory([]);
    } catch (err: any) {
      const message = err?.message || "Failed to clear history.";
      setHistoryError(message);
      throw err;
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      setHistory([]);
      return;
    }
    refreshHistory().catch(() => {});
  }, [refreshHistory, user, token, authLoading]);

  const value = useMemo(
    () => ({ history, latestResult, loadingHistory, historyError, refreshHistory, clearHistory, setLatestResult }),
    [history, latestResult, loadingHistory, historyError, refreshHistory, clearHistory]
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error("useTransactions must be used within TransactionsProvider");
  return ctx;
}
