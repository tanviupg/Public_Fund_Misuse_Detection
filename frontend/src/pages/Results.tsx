import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, ShieldCheck, ArrowLeft, LayoutDashboard, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTransactions } from "@/context/TransactionsContext";

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { latestResult } = useTransactions();
  const state = location.state as { input: { allocated_amount: number; spent_amount: number; work_status: "Completed" | "Incomplete" }; prediction: "Fraud" | "Normal" } | null;
  const data = state?.input || latestResult?.input || null;
  const prediction = state?.prediction || latestResult?.prediction || null;
  const [showAlert, setShowAlert] = useState(false);

  const analysis = useMemo(() => {
    if (!data || !prediction) return null;
    const ratio = data.allocated_amount ? data.spent_amount / data.allocated_amount : 0;
    let riskScore = 0;
    const reasons: string[] = [];

    if (data.spent_amount > data.allocated_amount) {
      riskScore += 45;
      reasons.push("Spent amount exceeds allocated budget");
    }
    if (data.work_status === "Incomplete") {
      riskScore += 30;
      reasons.push("Work marked as incomplete");
    }
    if (ratio > 1.2) {
      riskScore += 15;
      reasons.push("High expenditure ratio detected");
    }

    if (reasons.length === 0) reasons.push("No obvious risk flags from the provided inputs");

    if (prediction === "Normal") {
      riskScore = Math.min(riskScore, 25);
    } else {
      riskScore = Math.max(riskScore, 60);
    }

    return { prediction, riskScore: Math.min(riskScore, 100), reasons };
  }, [data, prediction]);

  useEffect(() => {
    if (!data) {
      navigate("/manual-entry");
      return;
    }
    if (analysis?.prediction === "Fraud") setShowAlert(true);
  }, [data, navigate, analysis]);

  if (!data || !analysis) return null;

  const { prediction: finalPrediction, riskScore, reasons } = analysis;
  const isFraud = finalPrediction === "Fraud";
  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showAlert && isFraud && (
        <div className="bg-fraud/10 border border-fraud/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-fraud" />
            <p className="font-semibold text-fraud">🚨 High Risk Transaction Detected</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAlert(false)}>Dismiss</Button>
        </div>
      )}

      <div className={`rounded-2xl p-8 text-center shadow-lg border-2 ${isFraud ? "border-fraud bg-fraud/5" : "border-normal bg-normal/5"}`}>
        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${isFraud ? "bg-fraud/10" : "bg-normal/10"}`}>
          {isFraud ? <ShieldAlert className="w-10 h-10 text-fraud" /> : <ShieldCheck className="w-10 h-10 text-normal" />}
        </div>
        <h2 className={`text-3xl font-extrabold mb-2 ${isFraud ? "text-fraud" : "text-normal"}`}>
          {isFraud ? "FRAUD DETECTED" : "NORMAL TRANSACTION"}
        </h2>
        <p className="text-muted-foreground">{isFraud ? "This transaction has been flagged as suspicious" : "This transaction appears to be legitimate"}</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold mb-3">Risk Score</h3>
        <div className="flex items-center gap-4">
          <Progress value={riskScore} className={`h-3 flex-1 ${isFraud ? "[&>div]:bg-fraud" : "[&>div]:bg-normal"}`} />
          <span className={`text-2xl font-bold ${isFraud ? "text-fraud" : "text-normal"}`}>{riskScore}%</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold mb-3">AI Explanation</h3>
        <ul className="space-y-2">
          {reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isFraud ? "bg-fraud" : "bg-normal"}`} />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold mb-3">Input Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-muted-foreground">Allocated</p><p className="font-semibold">{fmt(data.allocated_amount)}</p></div>
          <div><p className="text-muted-foreground">Spent</p><p className="font-semibold">{fmt(data.spent_amount)}</p></div>
          <div><p className="text-muted-foreground">Work Status</p><p className="font-semibold">{data.work_status}</p></div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate("/manual-entry")}>
          <ArrowLeft className="w-4 h-4" /> Try Again
        </Button>
        <Button className="flex-1 gap-2" onClick={() => navigate("/")}>
          <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
