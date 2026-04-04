import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PenLine } from "lucide-react";
import { predictTransaction } from "@/api/api";
import { useTransactions } from "@/context/TransactionsContext";
import { useAuth } from "@/context/AuthContext";

export default function ManualEntry() {
  const navigate = useNavigate();
  const { setLatestResult, refreshHistory } = useTransactions();
  const { user } = useAuth();
  const [allocated, setAllocated] = useState("");
  const [spent, setSpent] = useState("");
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!allocated || Number(allocated) <= 0) e.allocated = "Enter a valid positive number";
    if (!spent || Number(spent) <= 0) e.spent = "Enter a valid positive number";
    if (!status) e.status = "Select a work status";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      const payload = {
        allocated_amount: Number(allocated),
        spent_amount: Number(spent),
        work_status: status as "Completed" | "Incomplete",
      };
      const res = await predictTransaction(payload);
      const prediction = res?.prediction === "Fraud" ? "Fraud" : "Normal";

      setLatestResult({ prediction, input: payload });
      await refreshHistory();

      navigate("/results", { state: { input: payload, prediction } });
    } catch (err: any) {
      setApiError(err?.message || "Failed to analyze transaction.");
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === "viewer") {
    return (
      <div className="max-w-lg mx-auto rounded-xl border bg-card p-8 shadow-sm text-center">
        <h2 className="text-xl font-bold mb-2">Read-only access</h2>
        <p className="text-muted-foreground">Your role can view data but cannot submit new transactions.</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Manual Entry</h2>
        <p className="text-muted-foreground">Enter transaction details for fraud analysis</p>
      </div>

      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <PenLine className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">Transaction Details</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Allocated Amount (₹)</Label>
            <Input type="number" placeholder="e.g. 500000" value={allocated} onChange={(e) => setAllocated(e.target.value)} />
            {errors.allocated && <p className="text-sm text-fraud">{errors.allocated}</p>}
          </div>

          <div className="space-y-2">
            <Label>Spent Amount (₹)</Label>
            <Input type="number" placeholder="e.g. 650000" value={spent} onChange={(e) => setSpent(e.target.value)} />
            {errors.spent && <p className="text-sm text-fraud">{errors.spent}</p>}
          </div>

          <div className="space-y-2">
            <Label>Work Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-fraud">{errors.status}</p>}
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : "Check Fraud"}
          </Button>
          {apiError && <p className="text-sm text-fraud">{apiError}</p>}
        </form>
      </div>
    </div>
  );
}
