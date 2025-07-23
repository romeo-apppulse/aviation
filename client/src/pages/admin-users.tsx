import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet";
import { Search, UserCheck, UserX, Trash2, Users, Clock, CheckCircle, XCircle, Edit, Plus, Save, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const userEditSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "admin", "super_admin"]),
  status: z.enum(["pending", "approved", "blocked"])
});

type UserEditForm = z.infer<typeof userEditSchema>;

const newUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["user", "admin"]),
});

type NewUserForm = z.infer<typeof newUserSchema>;

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "blocked">("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: pendingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users/pending"],
  });

  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}/approve`, "PUT");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      toast({
        title: "Success",
        description: "User approved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}/block`, "PUT");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User blocked successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to block user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const editForm = useForm<UserEditForm>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "user",
      status: "pending"
    }
  });

  const newUserForm = useForm<NewUserForm>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "user"
    }
  });

  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UserEditForm }) => {
      return await apiRequest(`/api/admin/users/${userId}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      setEditingUser(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: NewUserForm) => {
      return await apiRequest("/api/admin/users", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      setShowNewUserDialog(false);
      newUserForm.reset();
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Set editing user data when dialog opens
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role || "user",
      status: user.status || "pending"
    });
  };

  const onEditSubmit = (data: UserEditForm) => {
    if (editingUser) {
      editUserMutation.mutate({ userId: editingUser.id, data });
    }
  };

  const onNewUserSubmit = (data: NewUserForm) => {
    createUserMutation.mutate(data);
  };

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === "all" || user.status === filter;
    
    return matchesSearch && matchesFilter;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "blocked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "blocked":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>User Management - Aviation Ape</title>
        <meta name="description" content="Manage user accounts and permissions in Aviation Ape portal" />
      </Helmet>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500">Manage user accounts and access permissions</p>
          </div>
          <Button
            onClick={() => setShowNewUserDialog(true)}
            className="bg-[#3498db] hover:bg-[#2980b9]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold">{users?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-bold">{pendingUsers?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Approved</p>
                  <p className="text-2xl font-bold">
                    {users?.filter(u => u.status === 'approved').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Blocked</p>
                  <p className="text-2xl font-bold">
                    {users?.filter(u => u.status === 'blocked').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <CardTitle>Users</CardTitle>
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search users..."
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={filter === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("pending")}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={filter === "approved" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("approved")}
                  >
                    Approved
                  </Button>
                  <Button
                    variant={filter === "blocked" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("blocked")}
                  >
                    Blocked
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 w-[25%]">User</th>
                    <th className="text-left p-2 w-[25%]">Email</th>
                    <th className="text-left p-2 w-[12%]">Status</th>
                    <th className="text-left p-2 w-[10%]">Role</th>
                    <th className="text-left p-2 w-[13%]">Joined</th>
                    <th className="text-left p-2 w-[15%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-semibold">
                              {user.firstName?.charAt(0) || user.email?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm break-words leading-tight">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.email
                              }
                            </p>
                            <p className="text-xs text-gray-500 truncate">ID: {user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="text-sm break-words">{user.email}</span>
                      </td>
                      <td className="p-2">
                        <Badge className={`${getStatusColor(user.status || 'pending')} flex items-center space-x-1 w-fit text-xs`}>
                          {getStatusIcon(user.status || 'pending')}
                          <span className="capitalize">{user.status || 'pending'}</span>
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {user.role || 'user'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className="text-xs">{formatDate(user.createdAt || new Date())}</span>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {/* Prevent actions on permanent admin (Zach) */}
                          {user.email === 'zacharypurvis2@gmail.com' ? (
                            <Badge variant="secondary" className="text-xs">
                              Permanent Admin
                            </Badge>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleEditUser(user)}
                                title="Edit User"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {user.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => approveUserMutation.mutate(user.id)}
                                  disabled={approveUserMutation.isPending}
                                  title="Approve User"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}
                              {user.status === 'approved' && user.role !== 'super_admin' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-yellow-600 hover:text-yellow-700"
                                  onClick={() => blockUserMutation.mutate(user.id)}
                                  disabled={blockUserMutation.isPending}
                                  title="Block User"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              )}
                              {user.status === 'blocked' && (
                                <Button
                                  size="sm"  
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => approveUserMutation.mutate(user.id)}
                                  disabled={approveUserMutation.isPending}
                                  title="Approve User"
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                    title="Delete User"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this user? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUserMutation.mutate(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium">No users found</h3>
                  <p className="text-gray-500 mt-2">
                    {searchTerm ? "No users match your search criteria." : "No users to display."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby="edit-user-description">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <p id="edit-user-description" className="text-sm text-gray-600">
              Update user information, role, and account status.
            </p>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editUserMutation.isPending}>
                  {editUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New User Dialog */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby="new-user-description">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <p id="new-user-description" className="text-sm text-gray-600">
              Create a new user account with email, password, and role assignment.
            </p>
          </DialogHeader>
          <Form {...newUserForm}>
            <form onSubmit={newUserForm.handleSubmit(onNewUserSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={newUserForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newUserForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={newUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password (min 6 characters)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newUserForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowNewUserDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}