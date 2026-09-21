type BadgeProps = {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
};

const variants = {
  success: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600",
  danger: "bg-red-500/10 text-red-600",
  info: "bg-blue-500/10 text-blue-600",
  neutral: "bg-zinc-500/10 text-zinc-600",
};

export function Badge({
  children,
  variant = "neutral",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
