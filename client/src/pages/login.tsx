import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plane, ArrowRight, ShieldCheck, Mail, Lock, Sparkles, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginUser } from "@shared/schema";


type LoginFormData = LoginUser;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.status === "invited") {
        toast({
          title: "Invite Pending",
          description: "You have a pending invite. Please check your email and follow the invite link to set your password.",
        });
        return;
      }
      if (data.status === "pending") {
        toast({
          title: "Account Pending",
          description: "Your administrative access is awaiting final verification.",
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome Back",
        description: "Your session has been securely established.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Access Denied",
        description: "Invalid credentials or unauthorized access attempt.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync(data);
    } catch (err) {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-indigo-100 italic-shadows">
      {/* Left Pane: Visual Branding */}
      <div className="hidden lg:flex flex-[0.6] relative overflow-hidden bg-[#0a0f1d]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] via-[#0a0f1d] to-[#1a1040]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/20 to-transparent" />

        <div className="relative h-full w-full flex flex-col justify-between p-16 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
              <Plane className="h-8 w-8 text-white stroke-[2px]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">AeroLease <span className="text-[#6366f1]">Wise</span></h1>
              <p className="text-[10px] font-bold text-white/50 tracking-[0.2em] uppercase">Fleet Intelligence OS</p>
            </div>
          </div>

          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              New Enterprise Layer 4.0
            </div>
            <h2 className="text-6xl font-bold text-white leading-[1.1] tracking-tight">
              Manage your fleet <br />
              with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-white">absolute precision.</span>
            </h2>
            <p className="text-lg text-white/60 leading-relaxed font-medium">
              The world's most advanced platform for aircraft leasing, compliance tracking, and predictive maintenance scheduling.
            </p>
          </div>

          <div className="flex items-center gap-12 text-white/40">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">12.8k</p>
              <p className="text-xs font-bold uppercase tracking-widest">Active Airframes</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">$4.2b</p>
              <p className="text-xs font-bold uppercase tracking-widest">Assets Managed</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white">99.9%</p>
              <p className="text-xs font-bold uppercase tracking-widest">Compliance Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="flex-1 lg:flex-[0.4] flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-white relative">
        <button
          onClick={() => setLocation("/")}
          className="absolute top-12 left-12 flex items-center gap-2 text-sm font-bold text-[#64748b] hover:text-[#1e293b] transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Site
        </button>

        <div className="w-full max-w-md mx-auto space-y-10">
          <div className="space-y-3">
            <h3 className="text-[32px] font-bold text-[#1e293b] tracking-tight">Operations Login</h3>
            <p className="text-[15px] font-medium text-[#64748b]">
              Enter your credentials to access the secure flight operations command center.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2 group">
              <Label className="text-[12px] font-bold text-[#1e293b] uppercase tracking-widest flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#6366f1]" />
                Secure Identity
              </Label>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="name@enterprise.aero"
                  className="h-14 rounded-2xl border-[#e2e8f0] focus:border-[#6366f1] focus:ring-[#6366f1]/10 px-5 text-sm font-semibold transition-all shadow-sm"
                  disabled={isLoading}
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-[11px] font-bold text-red-500 mt-1 uppercase tracking-wide">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2 group">
              <div className="flex justify-between items-center">
                <Label className="text-[12px] font-bold text-[#1e293b] uppercase tracking-widest flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-[#6366f1]" />
                  Encrypted Key
                </Label>
                <button
                  type="button"
                  className="text-[11px] font-bold text-[#6366f1] hover:underline uppercase tracking-widest"
                  onClick={() => toast({ title: "Password Reset", description: "Please contact your administrator to reset your password.", variant: "default" })}
                >
                  Reset Link
                </button>
              </div>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  className="h-14 rounded-2xl border-[#e2e8f0] focus:border-[#6366f1] focus:ring-[#6366f1]/10 px-5 text-sm font-semibold transition-all shadow-sm"
                  disabled={isLoading}
                  {...form.register("password")}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-[11px] font-bold text-red-500 mt-1 uppercase tracking-wide">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold text-[15px] shadow-lg shadow-indigo-100 transition-all duration-300 active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Access...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Authenticate
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
          </form>

          <footer className="pt-8 border-t border-[#f1f5f9] flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Enterprise Protected Access
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
