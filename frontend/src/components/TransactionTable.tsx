import { Transaction } from "@/context/TransactionsContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  transactions: Transaction[];
  showDate?: boolean;
  showReview?: boolean;
  canReview?: boolean;
  onUpdateStatus?: (id: number, status: "Flagged" | "Cleared") => void;
}

export default function TransactionTable({ transactions, showDate = false, showReview = false, canReview = false, onUpdateStatus }: Props) {
  const fmt = (n: number) => "Rs " + n.toLocaleString("en-IN");

  const reviewBadge = (status?: string) => {
    if (status === "Flagged") return "destructive";
    if (status === "Cleared") return "secondary";
    return "outline";
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-semibold text-muted-foreground">Allocated</th>
              <th className="text-left p-4 font-semibold text-muted-foreground">Spent</th>
              <th className="text-left p-4 font-semibold text-muted-foreground">Work Status</th>
              <th className="text-left p-4 font-semibold text-muted-foreground">Prediction</th>
              {showReview && <th className="text-left p-4 font-semibold text-muted-foreground">Review</th>}
              {showReview && canReview && <th className="text-left p-4 font-semibold text-muted-foreground">Actions</th>}
              {showDate && <th className="text-left p-4 font-semibold text-muted-foreground">Date</th>}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className={t.prediction === "Fraud" ? "fraud-row" : "normal-row"}>
                <td className="p-4 font-medium">{fmt(t.allocated_amount)}</td>
                <td className="p-4">{fmt(t.spent_amount)}</td>
                <td className="p-4">
                  <Badge variant={t.work_status === "Completed" ? "secondary" : "outline"}>
                    {t.work_status}
                  </Badge>
                </td>
                <td className="p-4">
                  <Badge className={t.prediction === "Fraud" ? "bg-fraud text-fraud-foreground hover:bg-fraud/90" : "bg-normal text-normal-foreground hover:bg-normal/90"}>
                    {t.prediction}
                  </Badge>
                </td>
                {showReview && (
                  <td className="p-4">
                    <Badge variant={reviewBadge(t.review_status)}>
                      {t.review_status || "Unreviewed"}
                    </Badge>
                  </td>
                )}
                {showReview && canReview && (
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onUpdateStatus?.(t.id, "Flagged")}>Flag</Button>
                      <Button size="sm" variant="outline" onClick={() => onUpdateStatus?.(t.id, "Cleared")}>Clear</Button>
                    </div>
                  </td>
                )}
                {showDate && <td className="p-4 text-muted-foreground">{new Date(t.date).toLocaleDateString()}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
