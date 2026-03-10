import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plane, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function AcceptInvite() {
    const search = useSearch();
    const params = new URLSearchParams(search);
    const token = params.get("token") || "";
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const { data: validation, isLoading, error } = useQuery<{ valid: boolean; name: string; email: string; role: string }>({
        queryKey: [`/api/auth/invite/validate?token=${token}`],
        enabled: !!token,
        retry: false,
    });

    const acceptMutation = useMutation({
        mutationFn: async (data: { token: string; password: string }) => {
            const res = await apiRequest("POST", "/api/auth/invite/accept", data);
            return res.json();
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            toast({
                title: "Account activated",
                description: "Welcome to AeroLease Wise! Your account is now active.",
            });
            const role = data?.role || validation?.role;
            if (role === "asset_owner") {
                setLocation("/owner");
            } else {
                setLocation("/portal");
            }
        },
        onError: (err: any) => {
            toast({
                title: "Failed to activate account",
                description: err.message || "Something went wrong",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            toast({ title: "Password too short", description: "Must be at least 8 characters.", variant: "destructive" });
            return;
        }
        if (password !== confirmPassword) {
            toast({ title: "Passwords don't match", description: "Please check and try again.", variant: "destructive" });
            return;
        }
        acceptMutation.mutate({ token, password });
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full rounded-2xl">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Link</h2>
                        <p className="text-gray-500">This invite link is missing a token. Please check your email for the correct link.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !validation?.valid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full rounded-2xl">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Invite Expired or Invalid</h2>
                        <p className="text-gray-500 mb-6">This invite link has expired or is invalid. Contact your account manager for a new invite.</p>
                        <Link href="/login">
                            <Button variant="outline" className="rounded-xl px-6 h-10 font-bold border-[#e2e8f0]">
                                Go to Login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="max-w-md w-full rounded-2xl shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="bg-[#007AFF] p-3 rounded-2xl w-fit mx-auto mb-4 shadow-lg shadow-blue-200">
                        <Plane className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Welcome, {validation.name}!
                    </CardTitle>
                    <CardDescription className="text-gray-500">
                        Set your password to activate your AeroLease Wise account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</Label>
                            <Input value={validation.email} disabled className="h-11 rounded-xl bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 8 characters"
                                className="h-11 rounded-xl"
                                required
                                minLength={8}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter password"
                                className="h-11 rounded-xl"
                                required
                                minLength={8}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-12 bg-[#007AFF] hover:bg-[#006ADF] text-white font-bold rounded-xl shadow-lg"
                            disabled={acceptMutation.isPending}
                        >
                            {acceptMutation.isPending ? "Activating..." : "Activate Account"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
