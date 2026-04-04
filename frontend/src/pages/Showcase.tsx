import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertTriangle, CheckCircle, FileDown, FileText, Filter, Shield, Bell, Activity, Layers, Target } from "lucide-react";
import StatCard from "@/components/StatCard";
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

const COLORS = ["hsl(0,84%,60%)", "hsl(142,71%,45%)"];

const kpis = [
  { title: "Transactions", value: "1,248", description: "Last 30 days", icon: Layers, variant: "primary" as const },
  { title: "Fraud Flags", value: "186", description: "Auto-detected", icon: AlertTriangle, variant: "fraud" as const },
  { title: "Clean Cases", value: "1,062", description: "Verified normal", icon: CheckCircle, variant: "success" as const },
  { title: "Avg Risk", value: "28%", description: "Model score", icon: Target, variant: "default" as const },
];

const trendData = [
  { day: "Mon", fraud: 18, normal: 62 },
  { day: "Tue", fraud: 24, normal: 58 },
  { day: "Wed", fraud: 20, normal: 64 },
  { day: "Thu", fraud: 28, normal: 55 },
  { day: "Fri", fraud: 32, normal: 48 },
  { day: "Sat", fraud: 26, normal: 53 },
  { day: "Sun", fraud: 19, normal: 61 },
];

const pieData = [
  { name: "Fraud", value: 186 },
  { name: "Normal", value: 1062 },
];

const alerts = [
  { id: "ALT-1008", title: "High-risk spike", description: "15 suspicious transactions in 30 min", level: "high" },
  { id: "ALT-1007", title: "Unusual vendor", description: "Payments to new vendor detected", level: "medium" },
  { id: "ALT-1006", title: "Budget overrun", description: "Allocated vs spent mismatch", level: "high" },
];

const savedFilters = [
  { name: "High Risk This Week", chips: ["Fraud", ">=80%", "Last 7 days"] },
  { name: "Incomplete Projects", chips: ["Incomplete", ">=60%"] },
  { name: "CSV Uploads", chips: ["Source: CSV", "Last 30 days"] },
];

const timeline = [
  { time: "09:12", text: "CSV batch uploaded (120 records)", tag: "Upload" },
  { time: "09:26", text: "Fraud alert triggered (risk 92%)", tag: "Alert" },
  { time: "10:05", text: "Manual review completed", tag: "Review" },
  { time: "11:30", text: "Weekly report generated", tag: "Report" },
];

const sampleTxns = [
  {
    id: "TXN-9842",
    allocated: 520000,
    spent: 790000,
    status: "Incomplete",
    prediction: "Fraud",
    risk: 92,
    explanation: ["Spending exceeds allocated amount", "Work is incomplete", "High expenditure ratio detected"],
  },
  {
    id: "TXN-9841",
    allocated: 360000,
    spent: 310000,
    status: "Completed",
    prediction: "Normal",
    risk: 21,
    explanation: ["No suspicious pattern detected"],
  },
  {
    id: "TXN-9837",
    allocated: 800000,
    spent: 980000,
    status: "Completed",
    prediction: "Fraud",
    risk: 81,
    explanation: ["Spending exceeds allocated amount", "Model flagged unusual spending pattern"],
  },
];

const qualityBadges = [
  { label: "3 Missing work_status", variant: "destructive" as const },
  { label: "2 Outlier budgets", variant: "secondary" as const },
  { label: "All numeric fields valid", variant: "outline" as const },
];

export default function Showcase() {
  const [threshold, setThreshold] = useState([75]);
  const [selected, setSelected] = useState(sampleTxns[0]);

  const heatmap = useMemo(() => {
    return [18, 22, 40, 58, 33, 28, 12, 44, 61, 19, 10, 37, 49, 66];
  }, []);

  const fmt = (n: number) => "?" + n.toLocaleString("en-IN");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">Mentor Showcase</h2>
        <p className="text-muted-foreground">A polished feature wall of analytics, alerts, and insights.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <StatCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Fraud Trend</h3>
              <p className="text-xs text-muted-foreground">Daily distribution of fraud vs normal</p>
            </div>
            <Badge variant="outline">Last 7 days</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="normal" stackId="1" stroke="hsl(142,71%,45%)" fill="hsl(142,71%,45%)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="fraud" stackId="1" stroke="hsl(0,84%,60%)" fill="hsl(0,84%,60%)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Fraud Ratio</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={4}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Fraud: 14.9%</span>
            <span>Normal: 85.1%</span>
          </div>
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
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${alert.level === "high" ? "bg-fraud/10 text-fraud" : "bg-primary/10 text-primary"}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Saved Filters</h3>
          <div className="space-y-4">
            {savedFilters.map((filter) => (
              <div key={filter.name} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{filter.name}</p>
                  <Button size="sm" variant="outline" className="gap-1">
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
            <Button className="w-full gap-2" variant="default">
              <FileText className="w-4 h-4" /> Generate Weekly PDF
            </Button>
            <Button className="w-full gap-2" variant="outline">
              <FileDown className="w-4 h-4" /> Export Filtered CSV
            </Button>
          </div>
          <div className="mt-5">
            <p className="text-xs text-muted-foreground mb-2">Report readiness</p>
            <Progress value={82} className="h-2" />
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
            <Badge variant="outline">Demo data</Badge>
          </div>
          <div className="space-y-3">
            {sampleTxns.map((txn) => (
              <div key={txn.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-semibold">{txn.id}</p>
                  <p className="text-xs text-muted-foreground">{txn.status} � {txn.prediction} � {txn.risk}% risk</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => setSelected(txn)}>View Details</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Transaction {selected.id}</DialogTitle>
                      <DialogDescription>Full payload, risk analysis, and explanation.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Allocated</p>
                        <p className="font-semibold">{fmt(selected.allocated)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p className="font-semibold">{fmt(selected.spent)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Work Status</p>
                        <p className="font-semibold">{selected.status}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-semibold mb-2">AI Explanation</p>
                      <ul className="space-y-2">
                        {selected.explanation.map((reason) => (
                          <li key={reason} className="text-sm text-muted-foreground">� {reason}</li>
                        ))}
                      </ul>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Model Info</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Model Version</p>
              <Badge variant="outline">RF-2.1.4</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="font-semibold">92.4%</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Last Trained</p>
              <p className="font-semibold">2026-03-29</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <p className="font-semibold text-fraud">3</p>
            </div>
          </div>
          <div className="mt-5">
            <Button variant="outline" className="w-full gap-2">
              <Shield className="w-4 h-4" /> Model Audit Log
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Activity Timeline</h3>
          <div className="space-y-3">
            {timeline.map((item) => (
              <div key={item.time} className="flex items-start gap-3">
                <div className="mt-1 w-2.5 h-2.5 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-semibold">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.time} � {item.tag}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Batch Upload Summary</h3>
          <p className="text-xs text-muted-foreground">Last CSV batch statistics</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Total Records</span>
              <span className="font-semibold">120</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Fraud Flags</span>
              <span className="font-semibold text-fraud">18</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Avg Risk</span>
              <span className="font-semibold">34%</span>
            </div>
          </div>
          <div className="mt-4">
            <Progress value={68} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">68% processed successfully</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Data Quality</h3>
          <div className="flex flex-wrap gap-2">
            {qualityBadges.map((badge) => (
              <Badge key={badge.label} variant={badge.variant}>{badge.label}</Badge>
            ))}
          </div>
          <div className="mt-5">
            <h4 className="text-sm font-semibold mb-2">Risk Heatmap</h4>
            <div className="grid grid-cols-7 gap-2">
              {heatmap.map((value, idx) => (
                <div
                  key={idx}
                  className="h-8 rounded-md"
                  style={{ backgroundColor: `rgba(239,68,68, ${value / 100})` }}
                  title={`Risk ${value}%`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Deeper red indicates higher risk clusters.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Mentor-Ready Highlights</h3>
            <p className="text-xs text-muted-foreground">Everything here is visible and demo-friendly.</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Activity className="w-4 h-4" /> Share Snapshot
          </Button>
        </div>
      </div>
    </div>
  );
}


