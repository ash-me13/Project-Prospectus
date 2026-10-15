import React from "react";
import {
  Menu,
  Building2,
  GitBranch,
  Calendar,
  Clock,
  User,
} from "lucide-react";
import { Button } from "../ui/button";
import { UserRole } from "@/types/academic";

export interface TopToolbarProps {
  currentCampus: string;
  onCampusChange: (campus: string) => void;
  currentTrack: string;
  onTrackChange: (track: string) => void;
  currentSemester: string;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenMobileMenu: () => void;
  onOpenQuickLog: () => void;
  canLog: boolean;
}

export function TopToolbar({
  currentCampus,
  onCampusChange,
  currentTrack,
  onTrackChange,
  currentSemester,
  currentRole,
  onRoleChange,
  onOpenMobileMenu,
  onOpenQuickLog,
  canLog,
}: TopToolbarProps) {
  return (
    <header className="glass-toolbar sticky top-0 z-40 h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu Trigger + Context Selectors */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-[#F7F8FC] border border-[#E6EAF2]"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Academic Context Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Campus Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#E6EAF2] text-xs font-medium text-[#172033] shadow-xs">
            <Building2 className="h-3.5 w-3.5 text-[#4965E8]" />
            <select
              aria-label="Select Campus"
              value={currentCampus}
              onChange={(e) => onCampusChange(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value="HITECH">HI-Tech Institute</option>
              <option value="RATNAM">Ratnam Institute</option>
              <option value="RGIB">RGIB Campus</option>
              <option value="JUJ">JUJ Jaipur</option>
            </select>
          </div>

          {/* Track Selector */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#E6EAF2] text-xs font-medium text-[#172033] shadow-xs">
            <GitBranch className="h-3.5 w-3.5 text-[#8878F5]" />
            <select
              aria-label="Select Track"
              value={currentTrack}
              onChange={(e) => onTrackChange(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer pr-1"
            >
              <option value="Mirai">Mirai Track</option>
              <option value="University">University Track</option>
            </select>
          </div>

          {/* Semester Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F7F8FC] border border-[#E6EAF2] text-xs text-[#64748B] font-mono">
            <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
            <span>{currentSemester}</span>
          </div>
        </div>
      </div>

      {/* Right: Role Persona Switcher & Fast Log Action */}
      <div className="flex items-center gap-3">
        {/* Persona Switcher (Allows testing Admin vs CM vs Faculty vs Student views) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#E6EAF2] text-xs font-medium text-[#172033] shadow-xs">
          <User className="h-3.5 w-3.5 text-[#64748B]" />
          <span className="text-[#64748B] hidden sm:inline">Role:</span>
          <select
            aria-label="Select User Role"
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-transparent focus:outline-none cursor-pointer font-semibold text-[#172033]"
          >
            <option value="admin">Admin</option>
            <option value="campus_manager">Campus Manager</option>
            <option value="faculty">Faculty</option>
            <option value="student">Student (Read-Only)</option>
          </select>
        </div>

        {/* Rapid Session Log Button (Only enabled for faculty and admin) */}
        {canLog && (
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenQuickLog}
            className="shadow-sm"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Log Session</span>
            <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded ml-1 font-bold">
              &lt;60s
            </span>
          </Button>
        )}
      </div>
    </header>
  );
}
