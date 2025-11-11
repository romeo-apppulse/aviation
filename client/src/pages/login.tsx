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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plane } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

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
      try {
        const response = await apiRequest("POST", "/api/auth/login", data);
        return response.json();
      } catch (error: any) {
        // Extract the actual error message from the error
        const errorMessage = error.message || "";
        
        // Parse JSON error messages if they exist
        if (errorMessage.includes("{")) {
          try {
            const jsonMatch = errorMessage.match(/\{.*\}/);
            if (jsonMatch) {
              const parsedError = JSON.parse(jsonMatch[0]);
              throw new Error(parsedError.message || errorMessage);
            }
          } catch (parseError) {
            // If parsing fails, use the original message
          }
        }
        
        throw error;
      }
    },
    onSuccess: async (data) => {
      if (data.status === "pending") {
        toast({
          title: "Account Pending Approval",
          description: "Your account is awaiting administrator approval. Please check back later.",
          variant: "default",
        });
        return;
      }
      
      // Invalidate auth cache and force full page load to dashboard
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      // Use full page reload to ensure auth state is properly loaded
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      // Extract clean error message
      const errorMessage = error.message || "";
      
      // Check for specific error types
      if (errorMessage.toLowerCase().includes("pending approval")) {
        toast({
          title: "Account Pending Approval",
          description: "Your account is awaiting administrator approval. Please check back later or contact support.",
          variant: "default",
        });
      } else if (errorMessage.toLowerCase().includes("blocked")) {
        toast({
          title: "Account Blocked",
          description: "Your account has been blocked. Please contact support for assistance.",
          variant: "destructive",
        });
      } else if (errorMessage.toLowerCase().includes("invalid")) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Failed",
          description: "Unable to sign in. Please check your credentials and try again.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      // Error is already handled by onError callback
      // This catch prevents unhandled rejection warnings
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <Plane className="h-10 w-10" />
              <span className="text-2xl font-bold">Aviation Ape</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to continue to your account</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                data-testid="input-email"
                {...form.register("email")}
                disabled={isLoading}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                data-testid="input-password"
                {...form.register("password")}
                disabled={isLoading}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <button
                type="button"
                onClick={() => setLocation("/register")}
                className="text-sky-600 hover:underline font-medium"
                data-testid="link-register"
              >
                Sign up
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
