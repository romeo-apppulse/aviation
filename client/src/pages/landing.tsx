import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Users, FileText, Wrench, DollarSign, BarChart3, TrendingUp, ShieldCheck, Zap, ArrowRight, Play } from "lucide-react";
import aircraft_final_logo from "@assets/aircraft-final-logo.png";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-brand/10 italic-shadows overflow-x-hidden">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand/10 border border-brand/20 shadow-sm">
            <img
              src={aircraft_final_logo}
              alt="AeroLease"
              className="h-8 w-8 object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1e293b] tracking-tight">AeroLease <span className="text-brand">Manager</span></h1>
            <p className="text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase leading-none mt-0.5">Fleet Intelligence OS</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[13px] font-bold uppercase tracking-widest text-slate-600">
          <a href="#" className="hover:text-brand transition-colors">Platform</a>
          <a href="#" className="hover:text-brand transition-colors">Solutions</a>
          <a href="#" className="hover:text-brand transition-colors">Enterprise</a>
        </div>
        <Button
          variant="ghost"
          className="text-sm font-bold text-[#1e293b] hover:bg-slate-50 rounded-xl px-6 h-11 border border-slate-200"
          onClick={() => setLocation("/login")}
        >
          Operations Login
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-20 pb-32 relative">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-brand/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 text-brand text-[11px] font-bold uppercase tracking-widest shadow-sm">
            <Zap className="h-4 w-4 fill-brand" />
            Empowering Global Aviation Leaders
          </div>

          <h1 className="text-[64px] md:text-[84px] font-bold text-[#0f172a] leading-[0.95] tracking-tight">
            Manage your fleet with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-indigo-600">absolute precision.</span>
          </h1>

          <p className="text-[18px] md:text-[22px] text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            The world's most advanced platform for aircraft leasing, compliance tracking, and predictive maintenance management. Built for enterprise flight operations.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
            <Button
              size="lg"
              className="bg-brand hover:bg-brand-hover text-white rounded-2xl px-10 h-16 text-base font-bold shadow-xl shadow-brand/20 transition-all active:scale-95 flex items-center gap-2"
              onClick={() => setLocation("/login")}
            >
              Access Command Center
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-white border-slate-200 text-[#1e293b] rounded-2xl px-10 h-16 text-base font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Play className="h-4 w-4 fill-[#1e293b]" />
              Watch Experience
            </Button>
          </div>

          <div className="pt-16 flex items-center justify-center gap-12 text-slate-300">
            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl font-bold text-[#1e293b]">$84.2b</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Assets Managed</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-100" />
            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl font-bold text-[#1e293b]">12.8k</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Active Airframes</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-100" />
            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl font-bold text-[#1e293b]">99.9%</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Compliance Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-50 py-32 border-y border-slate-100">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-[13px] font-bold text-brand uppercase tracking-[0.3em]">Core Intelligence</h2>
            <h3 className="text-[42px] font-bold text-[#1e293b] tracking-tight">Everything required to rule the skies.</h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="rounded-[32px] border-white shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-md hover:-translate-y-2 transition-all duration-300">
              <CardHeader className="p-8">
                <div className="w-14 h-14 bg-brand/10 rounded-2xl flex items-center justify-center text-brand mb-6">
                  <Plane className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold text-[#1e293b]">Fleet Management</CardTitle>
                <CardDescription className="text-slate-500 font-medium leading-relaxed pt-2">
                  Unified registry for diverse aircraft types. Track specifications, location, and operational availability in real-time.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-[32px] border-white shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-md hover:-translate-y-2 transition-all duration-300">
              <CardHeader className="p-8">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                  <Users className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold text-[#1e293b]">Dynamic Leases</CardTitle>
                <CardDescription className="text-slate-500 font-medium leading-relaxed pt-2">
                  Sophisticated tracking for dry and wet leases. Automated rent calculations and intuitive counterparty management.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-[32px] border-white shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-md hover:-translate-y-2 transition-all duration-300">
              <CardHeader className="p-8">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6">
                  <DollarSign className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold text-[#1e293b]">Unified Ledger</CardTitle>
                <CardDescription className="text-slate-500 font-medium leading-relaxed pt-2">
                  Zero-error payment tracking. Automated 10% management fee calculation and comprehensive receivable reporting.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-[32px] border-white shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-md hover:-translate-y-2 transition-all duration-300">
              <CardHeader className="p-8">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6">
                  <Wrench className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold text-[#1e293b]">Smart Maintenance</CardTitle>
                <CardDescription className="text-slate-500 font-medium leading-relaxed pt-2">
                  Predictive scheduling based on flight hours. Visual alerts for upcoming inspections and detailed service logs.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-[32px] border-white shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-md hover:-translate-y-2 transition-all duration-300">
              <CardHeader className="p-8">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
                  <FileText className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold text-[#1e293b]">Digital Vault</CardTitle>
                <CardDescription className="text-slate-500 font-medium leading-relaxed pt-2">
                  Military-grade security for your airworthiness certificates, registration papers, and insurance documents.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-[32px] border-white shadow-xl shadow-slate-200/50 bg-white/80 backdrop-blur-md hover:-translate-y-2 transition-all duration-300">
              <CardHeader className="p-8">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold text-[#1e293b]">Asset Yields</CardTitle>
                <CardDescription className="text-slate-500 font-medium leading-relaxed pt-2">
                  Granular financial analytics for every airframe. Monitor ROI and operational efficiency via interactive heatmaps.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-6 py-32">
        <Card className="rounded-[48px] border-none bg-[#0a0f1d] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand/20 to-transparent" />
          <CardContent className="p-16 md:p-24 relative z-10 text-center">
            <div className="max-w-3xl mx-auto space-y-10">
              <h2 className="text-[48px] md:text-[64px] font-bold text-white leading-tight">Ready to modernize your operations?</h2>
              <p className="text-xl text-white/50 font-medium">
                Join the network of professional operators who trust AeroLease Wise for their mission-critical fleet management needs.
              </p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-6">
                <Button
                  size="lg"
                  className="bg-brand hover:bg-brand-hover text-white rounded-2xl px-12 h-16 text-lg font-bold shadow-xl shadow-brand/40"
                  onClick={() => setLocation("/login")}
                >
                  Onboard Your Fleet
                </Button>
                <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-sm font-bold uppercase tracking-widest">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Enterprise Protected
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <p className="text-slate-400 text-sm font-medium">© 2024 AeroLease Wise. All rights reserved globally.</p>
        <div className="flex items-center gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
          <a href="#" className="hover:text-brand transition-colors">Privacy</a>
          <a href="#" className="hover:text-brand transition-colors">Terms</a>
          <a href="#" className="hover:text-brand transition-colors">Security</a>
        </div>
      </footer>
    </div>
  );
}