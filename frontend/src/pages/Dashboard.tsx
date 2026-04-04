import { useEffect, useMemo, useState } from "react";
import {
  FileBarChart,
  AlertTriangle,
  CheckCircle,
  Percent,
  Download,
  Bell,
  Filter,
  FileDown,
  FileText,
  Shield,
  RotateCcw,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import StatCard from "@/components/StatCard";
import TransactionTable from "@/components/TransactionTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { getModelInfo, getWeeklyReportPdf } from "@/api/api";
import { useTransactions } from "@/context/TransactionsContext";
import { useAuth } from "@/context/AuthContext";

const COLORS = ["hsl(0,84%,60%)", "hsl(142,71%,45%)"];

const buildQuickFilters = () => [
  {
    name: "High Risk This Week",
    params: { prediction: "Fraud", min_risk: 80, date_from: new Date(Date.now() - 7 * 86400000).toISOString() },
    chips: ["Fraud", ">=80%", "Last 7 days"],
  },
  {
    name: "Incomplete Projects",
    params: { work_status: "Incomplete", min_risk: 60 },
    chips: ["Incomplete", ">=60%"],
  },
  {
    name: "CSV Uploads",
    params: { source: "csv", date_from: new Date(Date.now() - 30 * 86400000).toISOString() },
    chips: ["Source: CSV", "Last 30 days"],
  },
];

export default function Dashboard() {
  const { history, refreshHistory } = useTransactions();
  const { user } = useAuth();
  const [threshold, setThreshold] = useState([75]);
  const [selectedTxnId, setSelectedTxnId] = useState<number | null>(null);
  const [modelInfo, setModelInfo] = useState<{ version?: string | null; accuracy?: number | null; last_trained?: string | null } | null>(null);
  const [reporting, setReporting] = useState(false);

  const quickFilters = useMemo(() => buildQuickFilters(), []);

  const stats = useMemo(() => {
    const total = history.length;
    const fraud = history.filter((t) => t.prediction === "Fraud").length;
    const normal = total - fraud;
    const pct = total ? ((fraud / total) * 100).toFixed(1) : "0";
    return { total, fraud, normal, pct };
  }, [history]);

  const pieData = [
    { name: "Fraud", value: stats.fraud },
    { name: "Normal", value: stats.normal },
  ];

  const barData = [
    { name: "Fraud", count: stats.fraud },
    { name: "Normal", count: stats.normal },
  ];

  const recentAlerts = useMemo(() => {
    return [...history]
      .filter((t) => (t.risk_score ?? 0) >= threshold[0])
      .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
      .slice(0, 3);
  }, [history, threshold]);

  const selectedTxn = useMemo(() => {
    return history.find((t) => t.id === selectedTxnId) || history[0] || null;
  }, [history, selectedTxnId]);

  const downloadCSV = () => {
    const header = "allocated_amount,spent_amount,work_status,prediction,date\n";
    const rows = history
      .map((t) => `${t.allocated_amount},${t.spent_amount},${t.work_status},${t.prediction},${t.date}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fraud_report.csv";
    a.click();
  };

  const downloadWeeklyPdf = async () => {
    try {
      setReporting(true);
      const blob = await getWeeklyReportPdf(threshold[0]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "weekly_report.pdf";
      a.click();
      toast({ title: "Weekly PDF ready", description: "Download started." });
    } catch (err: any) {
      toast({ title: "PDF generation failed", description: err?.message || "Unable to generate PDF." });
    } finally {
      setReporting(false);
    }
  };

  useEffect(() => {
    getModelInfo()
      .then((res) => setModelInfo(res))
      .catch((err) => {
        setModelInfo(null);
        toast({ title: "Model info unavailable", description: err?.message || "Unable to load model metadata." });
      });
  }, []);

  const refreshModelInfo = async () => {
    try {
      const res = await getModelInfo();
      setModelInfo(res);
      toast({ title: "Model info refreshed" });
    } catch (err: any) {
      toast({ title: "Model info unavailable", description: err?.message || "Unable to load model metadata." });
    }
  };

  const resetFilters = async () => {
    await refreshHistory();
    toast({ title: "Filters reset", description: "Showing all transactions." });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Overview of fund misuse detection analytics</p>
        </div>
        <Button onClick={downloadCSV} variant="outline" className="gap-2" disabled={user?.role === "viewer"}>
          <Download className="w-4 h-4" /> Download Report
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Transactions" value={stats.total} description="All processed transactions" icon={FileBarChart} variant="primary" />
        <StatCard title="Fraud Cases" value={stats.fraud} description="Flagged as suspicious" icon={AlertTriangle} variant="fraud" />
        <StatCard title="Normal Cases" value={stats.normal} description="Clean transactions" icon={CheckCircle} variant="success" />
        <StatCard title="Fraud Percentage" value={`${stats.pct}%`} description="Of total transactions" icon={Percent} variant="fraud" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Fraud vs Normal (Circular)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={100} paddingAngle={4}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Fraud: {stats.pct}%</span>
            <span>Normal: {stats.total ? (100 - Number(stats.pct)).toFixed(1) : "0"}%</span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Fraud vs Normal Counts</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Alert Threshold</h3>
            <Badge variant="secondary">{threshold[0]}% Risk</Badge>
          </div>
          <Slider value={threshold} onValueChange={setThreshold} min={40} max={95} step={5} />
          <p className="text-xs text-muted-foreground mt-3">Alerts trigger when risk score exceeds the threshold.</p>
          <div className="mt-5 space-y-3">
            {recentAlerts.length === 0 && (
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                No alerts at the current threshold.
              </div>
            )}
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.prediction === "Fraud" ? "bg-fraud/10 text-fraud" : "bg-primary/10 text-primary"}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Transaction {alert.id}</p>
                  <p className="text-xs text-muted-foreground">Risk {alert.risk_score ?? 0}% - {alert.prediction}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Saved Filters</h3>
            <Button size="sm" variant="outline" className="gap-1" onClick={resetFilters}>
              <RotateCcw className="w-3 h-3" /> Reset
            </Button>
          </div>
          <div className="space-y-4">
            {quickFilters.map((filter) => (
              <div key={filter.name} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{filter.name}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={async () => {
                      await refreshHistory(filter.params as any);
                      toast({ title: "Filter applied", description: filter.name });
                    }}
                  >
                    <Filter className="w-3 h-3" /> Apply
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {filter.chips.map((chip) => (
                    <Badge key={chip} variant="outline">{chip}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Report Center</h3>
          <div className="space-y-3">
            <Button className="w-full gap-2" variant="default" onClick={downloadWeeklyPdf} disabled={reporting || user?.role === "viewer"}>
              <FileText className="w-4 h-4" /> {reporting ? "Generating..." : "Generate Weekly PDF"}
            </Button>
            <Button className="w-full gap-2" variant="outline" onClick={downloadCSV} disabled={user?.role === "viewer"}>
              <FileDown className="w-4 h-4" /> Export Filtered CSV
            </Button>
          </div>
          <div className="mt-5">
            <p className="text-xs text-muted-foreground mb-2">Report readiness</p>
            <Progress value={Math.min(100, stats.total ? Math.round((stats.fraud / stats.total) * 100) + 40 : 40)} className="h-2" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Transaction Detail Drawer</h3>
              <p className="text-xs text-muted-foreground">Click a row to open detailed insights</p>
            </div>
            <Badge variant="outline">Live data</Badge>
          </div>
          <div className="space-y-3">
            {(history.slice(0, 3).length ? history.slice(0, 3) : history).map((txn) => (
              <div key={txn.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-semibold">TXN-{txn.id}</p>
                  <p className="text-xs text-muted-foreground">{txn.work_status} - {txn.prediction} - {txn.risk_score ?? 0}% risk</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => setSelectedTxnId(txn.id)}>View Details</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Transaction TXN-{selectedTxn?.id ?? txn.id}</DialogTitle>
                      <DialogDescription>Full payload, risk analysis, and explanation.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Allocated</p>
                        <p className="font-semibold">Rs {selectedTxn?.allocated_amount?.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p className="font-semibold">Rs {selectedTxn?.spent_amount?.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Work Status</p>
                        <p className="font-semibold">{selectedTxn?.work_status}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-semibold mb-2">AI Explanation</p>
                      <ul className="space-y-2">
                        {(selectedTxn?.explanation || ["No explanation available"]).map((reason) => (
                          <li key={reason} className="text-sm text-muted-foreground">- {reason}</li>
                        ))}
                      </ul>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
            {history.length === 0 && (
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">No transactions yet. Submit a manual entry or CSV upload.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Model Info</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Model Version</p>
              <Badge variant="outline">{modelInfo?.version || "N/A"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="font-semibold">{modelInfo?.accuracy != null ? `${modelInfo.accuracy}%` : "N/A"}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Last Trained</p>
              <p className="font-semibold">{modelInfo?.last_trained ? modelInfo.last_trained.slice(0, 10) : "N/A"}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <p className="font-semibold text-fraud">{recentAlerts.length}</p>
            </div>
          </div>
          <div className="mt-5">
            <Button variant="outline" className="w-full gap-2" onClick={refreshModelInfo}>
              <Shield className="w-4 h-4" /> Refresh Model Data
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <TransactionTable transactions={history.slice(0, 10)} showDate />
      </div>
    </div>
  );
}
