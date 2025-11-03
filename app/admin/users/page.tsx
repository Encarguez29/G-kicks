'use client';

export const dynamic = 'force-dynamic'


import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Users, Eye, EyeOff, Archive, Edit, Shield } from 'lucide-react';
import PasswordStrengthIndicator from '@/components/ui/password-strength-indicator';

// Admin user interface for admin_users table
interface StaffAdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'staff';
  permissions: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateUserForm {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface CreateAdminForm {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  username: string;
  role: 'admin' | 'staff';
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [staffAdminUsers, setStaffAdminUsers] = useState<StaffAdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [userToArchive, setUserToArchive] = useState<AdminUser | null>(null);
  
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: ''
  });

  const [createAdminForm, setCreateAdminForm] = useState<CreateAdminForm>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    username: '',
    role: 'staff'
  });

  // Fetch all users from gkicks database
  const fetchAdminUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users/gkicks');
      const data = await response.json();
      
      if (response.ok) {
        setAdminUsers(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Network error while fetching users');
    } finally {
      setLoading(false);
    }
  };

  // Create new staff admin user
  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!createAdminForm.email || !createAdminForm.password || !createAdminForm.first_name || !createAdminForm.last_name || !createAdminForm.username) {
      setError('Please fill in all required fields');
      return;
    }

    if (createAdminForm.password !== createAdminForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (createAdminForm.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: createAdminForm.email,
          password: createAdminForm.password,
          first_name: createAdminForm.first_name,
          last_name: createAdminForm.last_name,
          username: createAdminForm.username,
          role: createAdminForm.role
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Admin user created successfully: ${data.email}`);
        setCreateAdminForm({
          email: '',
          password: '',
          confirmPassword: '',
          first_name: '',
          last_name: '',
          username: '',
          role: 'staff'
        });
        fetchStaffAdminUsers(); // Refresh the list
      } else {
        setError(data.error || 'Failed to create admin user');
      }
    } catch (err) {
      setError('Network error while creating admin user');
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff admin users from admin_users table
  const fetchStaffAdminUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/admin-users');
      const data = await response.json();
      
      if (response.ok) {
        setStaffAdminUsers(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch admin users');
      }
    } catch (err) {
      setError('Network error while fetching admin users');
    } finally {
      setLoading(false);
    }
  };

  // Create new admin user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!createForm.email || !createForm.password || !createForm.first_name || !createForm.last_name) {
      setError('Please fill in all required fields');
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (createForm.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/admin/users/gkicks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          first_name: createForm.first_name,
          last_name: createForm.last_name,
          phone: createForm.phone || null
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`User created successfully: ${data.email}`);
        setCreateForm({
          email: '',
          password: '',
          confirmPassword: '',
          first_name: '',
          last_name: '',
          phone: ''
        });
        fetchAdminUsers(); // Refresh the list
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Network error while creating user');
    } finally {
      setLoading(false);
    }
  };

  // Archive user
  const handleArchiveUser = async (userId: number) => {
    if (!userToArchive) return;

    try {
      setLoading(true);
      
      // Determine if this is an admin user or regular user based on the userToArchive object
      const isAdminUser = 'username' in userToArchive || 'role' in userToArchive;
      const apiEndpoint = isAdminUser 
        ? `/api/admin/admin-users?id=${userId}`
        : `/api/admin/users/gkicks?id=${userId}`;
      
      const response = await fetch(apiEndpoint, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        setSuccess('User archived successfully');
        // Refresh the appropriate list based on user type
        if (isAdminUser) {
          fetchStaffAdminUsers();
        } else {
          fetchAdminUsers();
        }
        // Stay on current page after archiving
      } else {
        setError(data.error || 'Failed to archive user');
      }
    } catch (err) {
      setError('Network error while archiving user');
    } finally {
      setLoading(false);
      setIsArchiveDialogOpen(false);
      setUserToArchive(null);
    }
  };

  useEffect(() => {
    fetchAdminUsers();
    fetchStaffAdminUsers();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage user accounts for the GKicks database
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1 mt-2 sm:mt-0">
          <Users className="w-4 h-4 mr-2" />
          {adminUsers.length} Users
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="create" className="flex items-center gap-2 flex-1 sm:flex-none">
            <UserPlus className="w-4 h-4" />
            Create User
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2 flex-1 sm:flex-none">
            <Users className="w-4 h-4" />
            Manage Users
          </TabsTrigger>
          <TabsTrigger value="admin" className="flex items-center gap-2 flex-1 sm:flex-none">
            <Shield className="w-4 h-4" />
            Admin Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New User</CardTitle>
              <CardDescription>
                Create a new user account for the GKicks database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      type="text"
                      value={createForm.first_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      type="text"
                      value={createForm.last_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      if (value.length <= 11) {
                        setCreateForm(prev => ({ ...prev, phone: value }));
                      }
                    }}
                    placeholder="12345678901"
                    maxLength={11}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={createForm.password}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter secure password"
                        required
                        minLength={8}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {createForm.password && (
                      <PasswordStrengthIndicator password={createForm.password} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={createForm.confirmPassword}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm password"
                        required
                        minLength={8}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create User'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <CardTitle>Existing Users</CardTitle>
              <CardDescription>
                Manage existing user accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && adminUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p>Loading users...</p>
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No users found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first user using the "Create User" tab
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adminUsers.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg">
                       <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                           <div>
                             <h3 className="font-medium">
                               {user.first_name} {user.last_name}
                             </h3>
                             <p className="text-sm text-muted-foreground">{user.email}</p>
                             {user.phone && (
                               <p className="text-sm text-muted-foreground">{user.phone}</p>
                             )}
                           </div>
                          <div className="flex gap-2 mt-2 sm:mt-0">
                            <Badge variant={user.is_active ? "default" : "secondary"}>
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                            {user.is_admin && <Badge variant="outline">Admin</Badge>}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        {user.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUserToArchive(user);
                              setIsArchiveDialogOpen(true);
                            }}
                            disabled={loading}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Users Tab */}
        <TabsContent value="admin">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Create Admin User Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Admin User</CardTitle>
                <CardDescription>
                  Create a new administrator account for the staff management system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAdminUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-first-name">First Name *</Label>
                      <Input
                        id="admin-first-name"
                        type="text"
                        value={createAdminForm.first_name}
                        onChange={(e) => setCreateAdminForm({...createAdminForm, first_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-last-name">Last Name *</Label>
                      <Input
                        id="admin-last-name"
                        type="text"
                        value={createAdminForm.last_name}
                        onChange={(e) => setCreateAdminForm({...createAdminForm, last_name: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-username">Username *</Label>
                    <Input
                      id="admin-username"
                      type="text"
                      value={createAdminForm.username}
                      onChange={(e) => setCreateAdminForm({...createAdminForm, username: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email *</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={createAdminForm.email}
                      onChange={(e) => setCreateAdminForm({...createAdminForm, email: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-role">Role *</Label>
                    <select
                      id="admin-role"
                      value={createAdminForm.role}
                      onChange={(e) => setCreateAdminForm({...createAdminForm, role: e.target.value as 'admin' | 'staff'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        value={createAdminForm.password}
                        onChange={(e) => setCreateAdminForm({...createAdminForm, password: e.target.value})}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {createAdminForm.password && (
                      <PasswordStrengthIndicator password={createAdminForm.password} />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-confirm-password">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="admin-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={createAdminForm.confirmPassword}
                        onChange={(e) => setCreateAdminForm({...createAdminForm, confirmPassword: e.target.value})}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Admin User'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Existing Admin Users */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Admin Users</CardTitle>
                <CardDescription>
                  Manage existing administrator accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading admin users...</div>
                ) : staffAdminUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No admin users found. Create Admin User to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffAdminUsers.map((admin) => (
                      <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg">
                         <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                             <h3 className="font-medium">{admin.first_name} {admin.last_name}</h3>
                             <Badge variant={admin.role === 'admin' ? 'destructive' : 'secondary'}>
                               {admin.role}
                             </Badge>
                             {admin.is_active && (
                               <Badge variant="outline" className="text-green-600 border-green-600">
                                 Active
                               </Badge>
                             )}
                           </div>
                           <p className="text-sm text-muted-foreground">{admin.email}</p>
                           <p className="text-sm text-muted-foreground">@{admin.username}</p>
                         </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => {/* TODO: Add edit functionality */}}
                             disabled={loading}
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => {
                               setUserToArchive({...admin, is_admin: false} as AdminUser);
                               setIsArchiveDialogOpen(true);
                             }}
                             disabled={loading}
                             className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-950"
                           >
                             <Archive className="w-4 h-4" />
                           </Button>
                         </div>
                       </div>
                     ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-600">Archive User</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to archive "{userToArchive?.first_name} {userToArchive?.last_name}" ({userToArchive?.email})? This will move the user to the archive where they can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary hover:bg-secondary/80 border-border text-secondary-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleArchiveUser(userToArchive?.id || 0)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}