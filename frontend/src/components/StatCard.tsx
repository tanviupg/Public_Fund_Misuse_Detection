import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  variant?: "default" | "fraud" | "success" | "primary";
}

const variantStyles = {
  default: "bg-card border text-foreground",
  fraud: "bg-card border border-fraud/20 text-foreground",
  success: "bg-card border border-normal/20 text-foreground",
  primary: "bg-card border border-primary/20 text-foreground",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  fraud: "bg-fraud/10 text-fraud",
  success: "bg-normal/10 text-normal",
  primary: "bg-primary/10 text-primary",
};

export default function StatCard({ title, value, description, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <div className={`rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconStyles[variant]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
