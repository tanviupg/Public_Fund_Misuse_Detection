import { useState, useCallback } from "react";
import { Upload, FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionTable from "@/components/TransactionTable";
import { uploadCSV } from "@/api/api";
import { Transaction, useTransactions } from "@/context/TransactionsContext";
import { useAuth } from "@/context/AuthContext";

export default function CsvUpload() {
  const { refreshHistory } = useTransactions();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [results, setResults] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const processCSV = useCallback(async (f: File) => {
    setFile(f);
    setLoading(true);
    setError("");
    const text = await f.text();
    const lines = text.trim().split("\n").map((l) => l.split(",").map((c) => c.trim()));

    // Show preview (header + first 5 rows)
    setPreview(lines.slice(0, 6));

    try {
      const response = await uploadCSV(f);
      const txns: Transaction[] = (response || []).map((row: any, i: number) => {
        const alloc = Number(row.allocated_amount) || 0;
        const spent = Number(row.spent_amount) || 0;
        const statusRaw = String(row.work_status ?? "Completed");
        const status = statusRaw.toLowerCase().includes("incomp") ? "Incomplete" : "Completed";
        return {
          id: Date.now() + i + 1,
          allocated_amount: alloc,
          spent_amount: spent,
          work_status: status,
          prediction: row.prediction === "Fraud" ? "Fraud" : "Normal",
          date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
        };
      });

      setResults(txns);
      await refreshHistory();
    } catch (err: any) {
      setResults([]);
      setError(err?.message || "Failed to process CSV.");
    } finally {
      setLoading(false);
    }
  }, [refreshHistory]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) processCSV(f);
  }, [processCSV]);

  const downloadResults = () => {
    if (!results.length) return;
    const header = "allocated_amount,spent_amount,work_status,prediction\n";
    const rows = results.map((t) => `${t.allocated_amount},${t.spent_amount},${t.work_status},${t.prediction}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "csv_analysis_report.csv";
    a.click();
  };

  if (user?.role === "viewer") {
    return (
      <div className="max-w-lg mx-auto rounded-xl border bg-card p-8 shadow-sm text-center">
        <h2 className="text-xl font-bold mb-2">Read-only access</h2>
        <p className="text-muted-foreground">Your role can view data but cannot upload CSV files.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">CSV Upload</h2>
        <p className="text-muted-foreground">Upload a CSV file for batch fraud analysis</p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border bg-card"}`}
        onClick={() => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".csv"; inp.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) processCSV(f); }; inp.click(); }}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        <p className="font-semibold mb-1">Drag & drop your CSV file here</p>
        <p className="text-sm text-muted-foreground">or click to browse • Only .csv files accepted</p>
        {file && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-primary">
            <FileText className="w-4 h-4" /> {file.name}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Analyzing transactions...</p>
        </div>
      )}
      {error && !loading && (
        <div className="rounded-xl border border-fraud/40 bg-fraud/10 p-4 text-sm text-fraud">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && !loading && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold mb-3">File Preview</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {preview[0]?.map((h, i) => <th key={i} className="text-left p-3 font-semibold text-muted-foreground">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row, i) => (
                  <tr key={i} className="border-b">
                    {row.map((c, j) => <td key={j} className="p-3">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Analysis Results ({results.length} transactions)</h3>
            <Button onClick={downloadResults} variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" /> Download Report
            </Button>
          </div>
          <TransactionTable transactions={results} />
        </div>
      )}
    </div>
  );
}
