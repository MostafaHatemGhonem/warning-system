import { ArrowUpRight, AlertTriangle } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  change: string;
  trend: string;
};

export function StatCard({
  title,
  value,
  change,
  trend,
}: StatCardProps) {
  const isWarning = trend === "warning";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-zinc-500">{title}</p>

        <div
          className={`rounded-xl p-2 ${
            isWarning
              ? "bg-amber-500/10 text-amber-600"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          }`}
        >
          {isWarning ? (
            <AlertTriangle size={18} />
          ) : (
            <ArrowUpRight size={18} />
          )}
        </div>
      </div>

      <p className="text-3xl font-bold text-zinc-950 dark:text-white">
        {value}
      </p>

      <p
        className={`mt-2 text-xs ${
          isWarning ? "text-amber-600" : "text-zinc-500"
        }`}
      >
        {change}
      </p>
    </div>
  );
}
