export interface Transaction {
  id: string;
  allocated_amount: number;
  spent_amount: number;
  work_status: "Completed" | "Incomplete";
  prediction: "Fraud" | "Normal";
  date: string;
}

function randomDate() {
  const d = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
  return d.toISOString();
}

function detectFraud(allocated: number, spent: number, status: string): "Fraud" | "Normal" {
  const ratio = spent / allocated;
  if (ratio > 1.1 || (status === "Incomplete" && ratio > 0.8) || ratio > 1.5) return "Fraud";
  if (status === "Incomplete" && ratio > 0.6) return "Fraud";
  return "Normal";
}

export function generateMockData(count: number = 50): Transaction[] {
  return Array.from({ length: count }, (_, i) => {
    const allocated = Math.floor(Math.random() * 900000) + 100000;
    const spent = Math.floor(allocated * (0.5 + Math.random() * 1.0));
    const status: "Completed" | "Incomplete" = Math.random() > 0.4 ? "Completed" : "Incomplete";
    return {
      id: `TXN-${String(i + 1).padStart(4, "0")}`,
      allocated_amount: allocated,
      spent_amount: spent,
      work_status: status,
      prediction: detectFraud(allocated, spent, status),
      date: randomDate(),
    };
  });
}

export function predictTransaction(allocated: number, spent: number, status: string) {
  const prediction = detectFraud(allocated, spent, status);
  const ratio = spent / allocated;
  let riskScore = 0;
  const reasons: string[] = [];

  if (ratio > 1) {
    riskScore += 40;
    reasons.push("Spending exceeds allocated budget by " + Math.round((ratio - 1) * 100) + "%");
  }
  if (status === "Incomplete") {
    riskScore += 30;
    reasons.push("Work marked as incomplete despite significant spending");
  }
  if (ratio > 0.9 && status === "Incomplete") {
    riskScore += 20;
    reasons.push("High expenditure ratio with incomplete work status");
  }
  if (ratio > 1.3) {
    riskScore += 10;
    reasons.push("Severe budget overrun detected");
  }

  if (prediction === "Normal") {
    riskScore = Math.min(riskScore, 25);
    if (reasons.length === 0) reasons.push("Transaction within normal parameters");
  } else {
    riskScore = Math.max(riskScore, 60);
  }

  return { prediction, riskScore: Math.min(riskScore, 100), reasons };
}

// Singleton store
let _history: Transaction[] = generateMockData(30);

export function getHistory(): Transaction[] {
  return _history;
}

export function addToHistory(t: Transaction) {
  _history = [t, ..._history];
}
