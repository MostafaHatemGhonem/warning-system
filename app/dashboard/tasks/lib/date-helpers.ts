/**
 * Utilities for consistent timezone and task deadline calculations.
 */

export function getStartOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPresetDateString(preset: "today" | "tomorrow" | "weekend" | "next_week" | "end_of_month"): string {
  const d = new Date();
  
  if (preset === "today") {
    // Current date
  } else if (preset === "tomorrow") {
    d.setDate(d.getDate() + 1);
  } else if (preset === "weekend") {
    // Target next Friday/Sunday
    const dayOfWeek = d.getDay(); // 0 is Sunday, 5 is Friday
    const daysUntilWeekend = dayOfWeek >= 5 ? (7 - dayOfWeek + 5) : (5 - dayOfWeek);
    d.setDate(d.getDate() + daysUntilWeekend);
  } else if (preset === "next_week") {
    d.setDate(d.getDate() + 7);
  } else if (preset === "end_of_month") {
    d.setMonth(d.getMonth() + 1);
    d.setDate(0); // last day of current month
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type DueDateStatus = {
  isOverdue: boolean;
  isDueToday: boolean;
  label: string;
  colorClass: string;
  badgeClass: string;
};

export function getDueDateStatus(dueDate: string | Date | null | undefined, status: string): DueDateStatus {
  if (!dueDate) {
    return {
      isOverdue: false,
      isDueToday: false,
      label: "No deadline",
      colorClass: "text-zinc-400",
      badgeClass: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
    };
  }

  const due = new Date(dueDate);
  if (isNaN(due.getTime())) {
    return {
      isOverdue: false,
      isDueToday: false,
      label: "Invalid date",
      colorClass: "text-zinc-400",
      badgeClass: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
    };
  }

  const startOfToday = getStartOfToday();
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);

  // If already done, never overdue
  if (status === "done") {
    return {
      isOverdue: false,
      isDueToday: false,
      label: "Completed",
      colorClass: "text-emerald-600 dark:text-emerald-400",
      badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    };
  }

  // Check if Due Today
  if (due >= startOfToday && due <= endOfToday) {
    return {
      isOverdue: false,
      isDueToday: true,
      label: "Due Today",
      colorClass: "text-amber-600 dark:text-amber-400",
      badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60",
    };
  }

  // Check if Overdue (Strict rule: status !== 'done' and due < startOfToday)
  if (due < startOfToday) {
    const diffDays = Math.max(1, Math.floor((startOfToday.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      isOverdue: true,
      isDueToday: false,
      label: `Overdue by ${diffDays}d`,
      colorClass: "text-rose-600 dark:text-rose-400",
      badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 font-bold",
    };
  }

  // Future due date
  const diffDays = Math.ceil((due.getTime() - endOfToday.getTime()) / (1000 * 60 * 60 * 24));
  const formattedDate = due.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  
  if (diffDays === 1) {
    return {
      isOverdue: false,
      isDueToday: false,
      label: "Due Tomorrow",
      colorClass: "text-blue-600 dark:text-blue-400",
      badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    };
  }

  if (diffDays <= 7) {
    return {
      isOverdue: false,
      isDueToday: false,
      label: `Due in ${diffDays}d (${formattedDate})`,
      colorClass: "text-zinc-600 dark:text-zinc-300",
      badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    };
  }

  return {
    isOverdue: false,
    isDueToday: false,
    label: formattedDate,
    colorClass: "text-zinc-600 dark:text-zinc-400",
    badgeClass: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
}
