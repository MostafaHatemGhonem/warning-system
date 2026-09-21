export const dashboardStats = [
  {
    title: "Total Projects",
    value: "12",
    change: "+2 this month",
    trend: "up",
  },
  {
    title: "Active Projects",
    value: "5",
    change: "+1 this week",
    trend: "up",
  },
  {
    title: "Open Tasks",
    value: "48",
    change: "8 due soon",
    trend: "neutral",
  },
  {
    title: "Active Warnings",
    value: "3",
    change: "Needs review",
    trend: "warning",
  },
];

export const projects = [
  {
    id: "1",
    name: "Digital Twin Radar",
    description: "FMCW radar simulation and monitoring platform.",
    status: "Active",
    progress: 72,
    lead: "Mostafa Hatem",
    members: 8,
    dueDate: "Sep 30, 2026",
  },
  {
    id: "2",
    name: "Space School",
    description: "Space and technology education platform.",
    status: "Planning",
    progress: 24,
    lead: "Sara Ahmed",
    members: 6,
    dueDate: "Oct 15, 2026",
  },
  {
    id: "3",
    name: "Infinity Website",
    description: "Public website for Infinity Explorers.",
    status: "Active",
    progress: 55,
    lead: "Omar Khaled",
    members: 5,
    dueDate: "Oct 05, 2026",
  },
];

export const tasks = [
  {
    id: "1",
    title: "Create dashboard layout",
    project: "Infinity Website",
    assignee: "Mostafa Hatem",
    priority: "High",
    status: "In Progress",
    dueDate: "Tomorrow",
  },
  {
    id: "2",
    title: "Connect radar data engine",
    project: "Digital Twin Radar",
    assignee: "Ahmed Ali",
    priority: "Medium",
    status: "To Do",
    dueDate: "Sep 22",
  },
  {
    id: "3",
    title: "Review Space School proposal",
    project: "Space School",
    assignee: "Sara Ahmed",
    priority: "High",
    status: "In Review",
    dueDate: "Sep 20",
  },
];
