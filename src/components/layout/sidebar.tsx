import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  FileText,
  Clock,
  Award,
  Calendar,
  BarChart3,
  Settings,
  Shield,
  GraduationCap,
  Briefcase,
  UserCheck,
} from "lucide-react";
import { UserRole } from "@/types/academic";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["admin", "campus_manager", "faculty", "student"],
  },
  {
    id: "courses",
    label: "Courses",
    icon: BookOpen,
    roles: ["admin", "campus_manager", "faculty", "student"],
  },
  {
    id: "timetable",
    label: "Timetable",
    icon: CalendarDays,
    roles: ["admin", "campus_manager", "faculty", "student"],
  },
  {
    id: "lesson_plans",
    label: "Lesson Plans",
    icon: FileText,
    roles: ["admin", "campus_manager", "faculty"],
  },
  {
    id: "session_logs",
    label: "Session Logs",
    icon: Clock,
    roles: ["admin", "campus_manager", "faculty"],
    badge: "<60s",
  },
  {
    id: "exam_readiness",
    label: "Exam Readiness",
    icon: Award,
    roles: ["admin", "campus_manager", "faculty", "student"],
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: Calendar,
    roles: ["admin", "campus_manager", "faculty"],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["admin", "campus_manager"],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    roles: ["admin"],
  },
];

export interface SidebarProps {
  currentRole: UserRole;
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  className?: string;
  onCloseMobile?: () => void;
}

export function Sidebar({
  currentRole,
  activeSection,
  onSelectSection,
  className = "",
  onCloseMobile,
}: SidebarProps) {
  const visibleItems = NAVIGATION_ITEMS.filter((item) =>
    item.roles.includes(currentRole)
  );

  const roleLabels: Record<UserRole, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    admin: { label: "Academic Admin", icon: Shield },
    campus_manager: { label: "Campus Manager", icon: Briefcase },
    faculty: { label: "Teaching Faculty", icon: UserCheck },
    student: { label: "Student (Read-Only)", icon: GraduationCap },
  };

  const CurrentRoleIcon = roleLabels[currentRole].icon;

  return (
    <aside
      className={`w-64 bg-white border-r border-[#E6EAF2] flex flex-col justify-between shrink-0 select-none ${className}`}
    >
      <div>
        {/* Brand header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#E6EAF2]">
          <div className="h-9 w-9 rounded-lg bg-[#4965E8] flex items-center justify-center text-white shadow-xs">
            <span className="font-extrabold text-base tracking-tighter">P</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-[#172033]">
                Prospectus
              </span>
              <span className="text-[10px] font-semibold text-[#4965E8] bg-[#4965E8]/10 px-1.5 py-0.2 rounded">
                MSOT
              </span>
            </div>
            <p className="text-[11px] text-[#64748B]">Academic Analytics</p>
          </div>
        </div>

        {/* Current Role Indicator */}
        <div className="px-4 py-3 mx-3 my-3 rounded-lg bg-[#F7F8FC] border border-[#E6EAF2]">
          <div className="flex items-center gap-2">
            <CurrentRoleIcon className="h-4 w-4 text-[#4965E8]" />
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#64748B]">
                Active Persona
              </p>
              <p className="text-xs font-semibold text-[#172033]">
                {roleLabels[currentRole].label}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav aria-label="Main Navigation" className="px-3 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-subtle cursor-pointer ${
                  isActive
                    ? "bg-[#4965E8] text-white font-semibold shadow-xs"
                    : "text-[#64748B] hover:text-[#172033] hover:bg-[#F7F8FC]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#64748B]"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#16836B]/10 text-[#16836B]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#E6EAF2] text-[11px] text-[#64748B] space-y-1">
        <div className="flex items-center justify-between">
          <span>Engine Status</span>
          <span className="flex items-center gap-1 text-[#16836B] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16836B]" />
            16 / 16 Tests
          </span>
        </div>
        <p className="text-[10px] text-[#64748B]/70">Quiet Precision v1.0 &bull; 8pt Grid</p>
      </div>
    </aside>
  );
}
