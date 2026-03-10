import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plane, ArrowRight, ShieldCheck, Mail, Lock, User, CheckCircle2, ChevronLeft, Sparkles, Building } from "lucide-react";
import { cn } from "@/lib/utils";

// Importing the generated asset
import private_jet_interior_luxury from "@assets/private_jet_interior_luxury_1772494160124.png";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: () => {
      setRegistered(true);
      toast({
        title: "Registration Received",
        description: "Your administrative request has been logged and is pending review.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Unable to process the registration at this time.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex bg-white font-sans selection:bg-indigo-100 italic-shadows">
        <div className="hidden lg:flex flex-[0.6] relative bg-[#0a0f1d] overflow-hidden">
          <img
            src={private_jet_interior_luxury}
            alt="Luxury Interior"
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-transparent to-transparent" />
        </div>
        <div className="flex-1 flex flex-col justify-center px-12 lg:px-24">
          <div className="max-w-md mx-auto space-y-8 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100 shadow-sm animate-bounce-subtle">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-[#1e293b]">Request Logged</h1>
              <p className="text-[15px] font-medium text-[#64748b] leading-relaxed">
                Your enterprise account application for **AeroLease Wise** is now under manual verification. You will receive an email once your access is granted.
              </p>
            </div>
            <Button
              onClick={() => setLocation("/login")}
              className="w-full h-14 rounded-2xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold"
            >
              Go to Authentication
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-indigo-100 italic-shadows">
      {/* Left Pane: Visual Context */}
      <div className="hidden lg:flex flex-[0.5] relative overflow-hidden bg-[#061021]">
        <img
          src={private_jet_interior_luxury}
          alt="Luxury Cabin"
          className="absolute inset-0 w-full h-full object-cover opacity-70 scale-105 animate-slow-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#061021]/80 to-transparent" />

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

          <div className="space-y-6">
            <h2 className="text-5xl font-bold text-white leading-tight tracking-tight">
              Scale your <br />
              fleet operations <span className="text-indigo-400">worldwide.</span>
            </h2>
            <div className="space-y-4 max-w-md">
              {[
                "Unified asset management & ledger",
                "Automated compliance & documents",
                "Global lease portfolio scaling"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-white/80 font-medium">
                  <div className="h-5 w-5 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm font-bold text-white/30 uppercase tracking-[0.3em]">
            Est. 2024 / Global Aviation Standard
          </p>
        </div>
      </div>

      {/* Right Pane: Registration Form */}
      <div className="flex-1 lg:flex-[0.5] flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-white relative overflow-y-auto py-12">
        <button
          onClick={() => setLocation("/")}
          className="absolute top-12 left-12 flex items-center gap-2 text-sm font-bold text-[#64748b] hover:text-[#1e293b] transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Portal
        </button>

        <div className="w-full max-w-md mx-auto space-y-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-[#6366f1] text-[10px] font-bold uppercase tracking-widest shadow-sm mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Enterprise Registration
            </div>
            <h3 className="text-[32px] font-bold text-[#1e293b] tracking-tight">Onboard the Fleet</h3>
            <p className="text-[15px] font-medium text-[#64748b]">
              Join the elite circle of operators managing billions in aviation assets.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[#1e293b] uppercase tracking-widest flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-[#6366f1]" />
                  First Name
                </Label>
                <Input
                  placeholder="First name"
                  className="h-12 rounded-xl border-[#e2e8f0] focus:border-[#6366f1] focus:ring-[#6366f1]/10 px-4 text-sm font-semibold transition-all shadow-sm"
                  disabled={isLoading}
                  {...form.register("firstName")}
                />
                {form.formState.errors.firstName && (
                  <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wide">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-[#1e293b] uppercase tracking-widest">
                  Last Name
                </Label>
                <Input
                  placeholder="Last name"
                  className="h-12 rounded-xl border-[#e2e8f0] focus:border-[#6366f1] focus:ring-[#6366f1]/10 px-4 text-sm font-semibold transition-all shadow-sm"
                  disabled={isLoading}
                  {...form.register("lastName")}
                />
                {form.formState.errors.lastName && (
                  <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wide">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#1e293b] uppercase tracking-widest flex items-center gap-2">
                <Building className="h-3.5 w-3.5 text-[#6366f1]" />
                Corporate Identity
              </Label>
              <Input
                type="email"
                placeholder="identity@enterprise.aero"
                className="h-12 rounded-xl border-[#e2e8f0] focus:border-[#6366f1] focus:ring-[#6366f1]/10 px-4 text-sm font-semibold transition-all shadow-sm"
                disabled={isLoading}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wide">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-[#1e293b] uppercase tracking-widest flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-[#6366f1]" />
                Encryption Key
              </Label>
              <Input
                type="password"
                placeholder="Create a strong key..."
                className="h-12 rounded-xl border-[#e2e8f0] focus:border-[#6366f1] focus:ring-[#6366f1]/10 px-4 text-sm font-semibold transition-all shadow-sm"
                disabled={isLoading}
                {...form.register("password")}
              />
              <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest mt-1">Min. 8 characters</p>
              {form.formState.errors.password && (
                <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-wide">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold text-[15px] shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing Identity...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Apply for Access
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
          </form>

          <footer className="pt-8 border-t border-[#f1f5f9] flex items-center justify-center gap-2 text-[14px] font-medium text-[#64748b]">
            <span>Already registered?</span>
            <button
              onClick={() => setLocation("/login")}
              className="text-[#6366f1] font-bold hover:underline"
            >
              Sign In
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
