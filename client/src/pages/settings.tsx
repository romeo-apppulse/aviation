import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertCircle, Save, User as UserIcon, Mail, Lock, Shield, CheckCircle, XCircle, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const emailPreferencesSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
  emailPaymentReminders: z.boolean(),
  emailMaintenanceAlerts: z.boolean(),
  emailLeaseExpiry: z.boolean(),
  emailSystemUpdates: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type EmailPreferencesFormData = z.infer<typeof emailPreferencesSchema>;

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "notifications">("profile");

  // Email service status
  const { data: emailStatus, isLoading: emailStatusLoading } = useQuery<{
    emailServiceReady: boolean;
    timestamp: string;
  }>({
    queryKey: ["/api/notifications/email/status"],
  });

  // Test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/email/test", {}),
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "Check your email inbox for the test notification",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send test email",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  });

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const emailPreferencesForm = useForm<EmailPreferencesFormData>({
    resolver: zodResolver(emailPreferencesSchema),
    defaultValues: {
      emailNotificationsEnabled: user?.emailNotificationsEnabled ?? true,
      emailPaymentReminders: user?.emailPaymentReminders ?? true,
      emailMaintenanceAlerts: user?.emailMaintenanceAlerts ?? true,
      emailLeaseExpiry: user?.emailLeaseExpiry ?? true,
      emailSystemUpdates: user?.emailSystemUpdates ?? true,
    },
  });

  // Reset forms when user data loads
  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
      
      emailPreferencesForm.reset({
        emailNotificationsEnabled: user.emailNotificationsEnabled ?? true,
        emailPaymentReminders: user.emailPaymentReminders ?? true,
        emailMaintenanceAlerts: user.emailMaintenanceAlerts ?? true,
        emailLeaseExpiry: user.emailLeaseExpiry ?? true,
        emailSystemUpdates: user.emailSystemUpdates ?? true,
      });
    }
  }, [user, profileForm, emailPreferencesForm]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => apiRequest("PUT", "/api/auth/user", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormData) => apiRequest("PUT", "/api/auth/password", data),
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Update Failed",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEmailPreferencesMutation = useMutation({
    mutationFn: (data: EmailPreferencesFormData) => apiRequest("PUT", "/api/auth/email-preferences", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Email Preferences Updated",
        description: "Your email notification preferences have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update email preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    updatePasswordMutation.mutate(data);
  };

  const onEmailPreferencesSubmit = (data: EmailPreferencesFormData) => {
    updateEmailPreferencesMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-50 border-r">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your preferences</p>
        </div>
        <nav className="p-4 space-y-2">
          <Button
            variant={activeTab === "profile" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("profile")}
          >
            <UserIcon className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button
            variant={activeTab === "password" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("password")}
          >
            <Lock className="h-4 w-4 mr-2" />
            Password
          </Button>
          <Button
            variant={activeTab === "notifications" ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("notifications")}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email Notifications
          </Button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4">
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and email address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-blue-500 text-white text-lg">
                      {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">Profile Picture</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Your profile picture is managed by your Replit account
                    </p>
                    <Button variant="outline" size="sm" disabled>
                      Change Picture
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Profile Form */}
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Changes to your email address will require verification and may affect your login.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="w-full md:w-auto"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {activeTab === "password" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="h-5 w-5 mr-2" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your current password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm your new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Your password should be at least 8 characters long and contain a mix of letters, numbers, and symbols.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                      className="w-full md:w-auto"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Test and configure email notification settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                {/* Email Service Status */}
                <div className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-medium">Email Service Status</h3>
                    {emailStatusLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    ) : emailStatus?.emailServiceReady ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Online
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <XCircle className="h-5 w-5 mr-2" />
                        Offline
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      <strong>Status:</strong> {emailStatus?.emailServiceReady ? 'Connected' : 'Not Available'}
                    </p>
                    <p>
                      <strong>Your Email:</strong> {user?.email || 'Not provided'}
                    </p>
                    {emailStatus?.timestamp && (
                      <p>
                        <strong>Last Checked:</strong> {new Date(emailStatus.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Test Email Section */}
                <div className="border rounded-lg p-3">
                  <h3 className="text-base font-medium mb-2">Test Email Notifications</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Send a test email notification to verify that the email system is working properly.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => sendTestEmailMutation.mutate()}
                      disabled={sendTestEmailMutation.isPending || !emailStatus?.emailServiceReady || !user?.email}
                      className="flex-1 sm:flex-none"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendTestEmailMutation.isPending ? "Sending..." : "Send Test Email"}
                    </Button>
                  </div>

                  {!user?.email && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You need to provide an email address in your profile to receive email notifications.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!emailStatus?.emailServiceReady && (
                    <Alert className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Email service is currently unavailable. Please try again later or contact support.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Email Preferences Form */}
                <div className="border rounded-lg p-3">
                  <h3 className="text-base font-medium mb-2">Email Preferences</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Control which email notifications you receive from AeroLease Manager.
                  </p>
                  
                  <Form {...emailPreferencesForm}>
                    <form onSubmit={emailPreferencesForm.handleSubmit(onEmailPreferencesSubmit)} className="space-y-1">
                      {/* Master email toggle */}
                      <FormField
                        control={emailPreferencesForm.control}
                        name="emailNotificationsEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                Email Notifications
                              </FormLabel>
                              <div className="text-sm text-gray-500">
                                Enable or disable all email notifications
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* Individual notification types */}
                      <div className="space-y-1">
                        <FormField
                          control={emailPreferencesForm.control}
                          name="emailPaymentReminders"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">
                                  Payment Reminders
                                </FormLabel>
                                <div className="text-xs text-gray-500">
                                  Receive notifications when payments are due
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!emailPreferencesForm.watch('emailNotificationsEnabled')}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={emailPreferencesForm.control}
                          name="emailMaintenanceAlerts"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">
                                  Maintenance Alerts
                                </FormLabel>
                                <div className="text-xs text-gray-500">
                                  Get notified about upcoming maintenance schedules
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!emailPreferencesForm.watch('emailNotificationsEnabled')}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={emailPreferencesForm.control}
                          name="emailLeaseExpiry"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">
                                  Lease Expiration Alerts
                                </FormLabel>
                                <div className="text-xs text-gray-500">
                                  Receive alerts when leases are about to expire
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!emailPreferencesForm.watch('emailNotificationsEnabled')}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={emailPreferencesForm.control}
                          name="emailSystemUpdates"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">
                                  System Updates
                                </FormLabel>
                                <div className="text-xs text-gray-500">
                                  Get notified about system updates and new features
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!emailPreferencesForm.watch('emailNotificationsEnabled')}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-2 mb-0">
                        <Button 
                          type="submit" 
                          disabled={updateEmailPreferencesMutation.isPending}
                          className="w-full md:w-auto"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {updateEmailPreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}