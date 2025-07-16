import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const supportRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  priority: z.enum(["low", "medium", "high", "urgent"], {
    required_error: "Please select a priority level",
  }),
  category: z.enum(["technical", "billing", "feature", "bug", "general"], {
    required_error: "Please select a category",
  }),
  message: z.string().min(10, "Message must be at least 10 characters long"),
});

type SupportRequestFormData = z.infer<typeof supportRequestSchema>;

export default function HelpSupport() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<SupportRequestFormData>({
    resolver: zodResolver(supportRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      priority: "medium",
      category: "general",
      message: "",
    },
  });

  const submitSupportRequest = useMutation({
    mutationFn: (data: SupportRequestFormData) =>
      apiRequest("/api/support/request", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
      toast({
        title: "Support request submitted",
        description: "We'll get back to you within 24 hours.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit support request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupportRequestFormData) => {
    submitSupportRequest.mutate(data);
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-700 text-lg sm:text-xl">Request Submitted!</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Thank you for contacting us. We've received your support request and will respond within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setSubmitted(false)}
              variant="outline"
              className="w-full"
            >
              Submit Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Get help with your aircraft management system or contact our support team
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Contact Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Phone Support</h3>
                  <p className="text-gray-600 text-sm sm:text-base break-all">1-800-AERO-LEASE</p>
                  <p className="text-gray-600 text-sm sm:text-base break-all">(1-800-237-6532)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Email Support</h3>
                  <p className="text-gray-600 text-sm sm:text-base break-all">support@aerolease.com</p>
                  <p className="text-gray-600 text-sm sm:text-base break-all">billing@aerolease.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Office Address</h3>
                  <div className="text-gray-600 text-sm sm:text-base">
                    <p className="break-words">123 Aviation Way</p>
                    <p className="break-words">Suite 500</p>
                    <p className="break-words">Miami, FL 33142</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Business Hours</h3>
                  <div className="text-gray-600 text-sm sm:text-base space-y-1">
                    <p className="break-words">Monday - Friday: 8:00 AM - 8:00 PM EST</p>
                    <p className="break-words">Saturday: 9:00 AM - 5:00 PM EST</p>
                    <p className="break-words">Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Support */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-red-600">Emergency Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3 text-sm sm:text-base break-words">
                For urgent aircraft maintenance or safety issues:
              </p>
              <p className="font-semibold text-red-600 text-sm sm:text-base break-all">
                Emergency Hotline: 1-800-AERO-911
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 break-words">
                Available 24/7 for critical aircraft issues
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Support Request Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Submit a Support Request
              </CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      {...form.register("name")}
                      placeholder="Enter your full name"
                      className="mt-1"
                    />
                    {form.formState.errors.name && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="Enter your email address"
                      className="mt-1"
                    />
                    {form.formState.errors.email && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    {...form.register("subject")}
                    placeholder="Brief description of your issue"
                    className="mt-1"
                  />
                  {form.formState.errors.subject && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.subject.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={form.watch("category")}
                      onValueChange={(value) => form.setValue("category", value as any)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical Support</SelectItem>
                        <SelectItem value="billing">Billing & Payments</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="bug">Bug Report</SelectItem>
                        <SelectItem value="general">General Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.category && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.category.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority *</Label>
                    <Select
                      value={form.watch("priority")}
                      onValueChange={(value) => form.setValue("priority", value as any)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.priority && (
                      <p className="text-red-500 text-sm mt-1">
                        {form.formState.errors.priority.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    {...form.register("message")}
                    placeholder="Please describe your issue in detail..."
                    rows={6}
                    className="mt-1"
                  />
                  {form.formState.errors.message && (
                    <p className="text-red-500 text-sm mt-1">
                      {form.formState.errors.message.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitSupportRequest.isPending}
                >
                  {submitSupportRequest.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Support Request
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}