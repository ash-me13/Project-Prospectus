"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, ArrowRight, ShieldCheck, UserCheck, GraduationCap, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserRole } from "@/types/academic";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"staff" | "student">("staff");

  const handleDemoLogin = (role: UserRole) => {
    setIsLoading(true);
    // Simulate instantaneous local session setup
    if (typeof window !== "undefined") {
      localStorage.setItem("prospectus_demo_role", role);
    }
    setTimeout(() => {
      router.push("/");
    }, 200);
  };

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      router.push("/");
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#4965E8] selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        {/* Brand Mark */}
        <div className="inline-flex h-12 w-12 rounded-xl bg-[#4965E8] items-center justify-center text-white shadow-sm ring-4 ring-[#4965E8]/10 mx-auto">
          <Compass className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#172033]">
            Prospectus
          </h1>
          <p className="text-xs uppercase font-bold tracking-widest text-[#8878F5]">
            MSOT Academic SaaS Platform
          </p>
        </div>
        <p className="text-xs text-[#64748B] max-w-sm mx-auto">
          Deterministic syllabus pacing, session logging, and exam readiness tracking.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="card-quiet p-6 sm:p-8 space-y-6">
          {/* Staff vs Student Selector */}
          <div className="grid grid-cols-2 p-1 bg-[#F7F8FC] rounded-lg border border-[#E6EAF2] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMethod("staff")}
              className={`py-1.5 rounded-md transition-subtle cursor-pointer ${
                authMethod === "staff"
                  ? "bg-white text-[#172033] shadow-xs"
                  : "text-[#64748B] hover:text-[#172033]"
              }`}
            >
              Faculty &amp; Staff (msot.org)
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("student")}
              className={`py-1.5 rounded-md transition-subtle cursor-pointer ${
                authMethod === "student"
                  ? "bg-white text-[#172033] shadow-xs"
                  : "text-[#64748B] hover:text-[#172033]"
              }`}
            >
              Student Portal (ID/OTP)
            </button>
          </div>

          <form onSubmit={handleStandardSubmit} className="space-y-4">
            <Input
              label={authMethod === "staff" ? "Academic Email" : "Student Roll Number / Email"}
              type="email"
              placeholder={authMethod === "staff" ? "faculty@msot.org" : "student2026@msot.org"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password / Access Code"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              <span>Sign In to Prospectus</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Demo Persona Switcher */}
          <div className="pt-5 border-t border-[#E6EAF2] space-y-3">
            <p className="text-[11px] font-semibold text-[#64748B] text-center uppercase tracking-wider">
              Immediate Persona Switch (Architectural Sandbox)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("admin")}
                className="justify-start text-xs h-9"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#4965E8] mr-1.5 shrink-0" />
                <span className="truncate">Admin Mode</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("campus_manager")}
                className="justify-start text-xs h-9"
              >
                <Briefcase className="h-3.5 w-3.5 text-[#8878F5] mr-1.5 shrink-0" />
                <span className="truncate">Campus Mgr</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("faculty")}
                className="justify-start text-xs h-9"
              >
                <UserCheck className="h-3.5 w-3.5 text-[#16836B] mr-1.5 shrink-0" />
                <span className="truncate">Faculty (&lt;60s)</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("student")}
                className="justify-start text-xs h-9"
              >
                <GraduationCap className="h-3.5 w-3.5 text-[#B87918] mr-1.5 shrink-0" />
                <span className="truncate">Student View</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Security notice */}
        <p className="mt-4 text-center text-[11px] text-[#64748B] flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-[#16836B]" />
          <span>Server-side RBAC and Row Level Security active</span>
        </p>
      </div>
    </div>
  );
}
