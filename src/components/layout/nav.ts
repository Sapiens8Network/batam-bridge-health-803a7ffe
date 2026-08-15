import {
  Activity,
  Bot,
  BarChart3,
  BedDouble,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  Stethoscope,
  Tags,
  Users,
} from "lucide-react";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inquiries", label: "Inquiries", icon: ClipboardList },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/messages", label: "Messages", icon: MessagesSquare },
  { to: "/ai-activity", label: "AI Activity", icon: Activity },
  { to: "/quotes", label: "Quotes & Itineraries", icon: FileText },
  { to: "/doctors", label: "Doctors", icon: Stethoscope },
  { to: "/treatments", label: "Treatments & Pricing", icon: Tags },
  { to: "/logistics", label: "Hotels & Transport", icon: BedDouble },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/chat", label: "Patient Web Chat", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;
