'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Bell, Moon, Sun, Trash2, User, Shield, Smartphone, Mail, Settings, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { userSettings, settingsHelpers } from '@/lib/settings';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [pushNotifications, setPushNotifications] = useState(false);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load notification settings from persistent storage
      const notifications = await settingsHelpers.getUserNotifications();
      setPushNotifications(notifications.pushNotifications);
      setEmailUpdates(notifications.emailUpdates);
      
      // Load theme setting
      const userTheme = await settingsHelpers.getUserTheme();
      if (userTheme !== theme) {
        setTheme(userTheme);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback to localStorage if database fails
      const savedPushNotifications = localStorage.getItem('pushNotifications');
      const savedEmailUpdates = localStorage.getItem('emailUpdates');
      
      if (savedPushNotifications !== null) {
        setPushNotifications(JSON.parse(savedPushNotifications));
      }
      if (savedEmailUpdates !== null) {
        setEmailUpdates(JSON.parse(savedEmailUpdates));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushNotificationsChange = async (checked: boolean) => {
    setPushNotifications(checked);
    try {
      await settingsHelpers.setUserNotifications({ pushNotifications: checked });
    } catch (error) {
      console.error('Error saving push notifications setting:', error);
      // Fallback to localStorage
      localStorage.setItem('pushNotifications', JSON.stringify(checked));
    }
  };

  const handleEmailUpdatesChange = async (checked: boolean) => {
    setEmailUpdates(checked);
    try {
      await settingsHelpers.setUserNotifications({ emailUpdates: checked });
    } catch (error) {
      console.error('Error saving email updates setting:', error);
      // Fallback to localStorage
      localStorage.setItem('emailUpdates', JSON.stringify(checked));
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    try {
      await settingsHelpers.setUserTheme(newTheme);
      toast({
        title: newTheme === 'dark' ? "Dark Mode Enabled" : "Dark Mode Disabled",
        description: newTheme === 'dark' ? "Switched to dark theme for better viewing in low light" : "Switched to light theme",
      });
    } catch (error) {
      console.error('Error saving theme setting:', error);
    }
  };

  const handleNotificationChange = async (type: string, enabled: boolean) => {
    if (type === "push") {
      await handlePushNotificationsChange(enabled);
      toast({
        title: enabled ? "Push Notifications Enabled" : "Push Notifications Disabled",
        description: enabled
          ? "You'll receive notifications about orders and promotions"
          : "You won't receive push notifications",
      });
    } else if (type === "email") {
      await handleEmailUpdatesChange(enabled);
      toast({
        title: enabled ? "Email Updates Enabled" : "Email Updates Disabled",
        description: enabled
          ? "You'll receive email updates about new products and sales"
          : "You won't receive email updates",
      });
    }
  };

  const handleDarkModeChange = (enabled: boolean) => {
    const newTheme = enabled ? "dark" : "light";
    handleThemeChange(newTheme);
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deleted",
      description: "Your account has been permanently deleted.",
      variant: "destructive",
    });
    router.push("/");
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          <div className="h-20 bg-gray-200 dark:bg-gray-700"></div>
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isDarkMode = theme === "dark"

  return (
    <div className="min-h-screen bg-background transition-colors">
     

      <div className="bg-background min-h-screen transition-colors">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-8 w-8 text-gray-700 dark:text-yellow-400" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-yellow-400">Settings</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">Manage your account preferences and settings</p>
          </div>

          <div className="space-y-6">
            {/* Notifications Section */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-gray-700 dark:text-yellow-400" />
                  <div>
                    <CardTitle className="text-gray-900 dark:text-yellow-400">Notifications</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300">
                      Choose what notifications you want to receive
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-gray-900 dark:text-yellow-400">Push Notifications</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Receive notifications about orders and promotions
                    </p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={(checked) => handleNotificationChange("push", checked)}
                  />
                </div>

                <Separator className="bg-border" />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-foreground">Email Updates</h4>
                    <p className="text-sm text-muted-foreground">
                      Get email updates about new products and sales
                    </p>
                  </div>
                  <Switch
                    checked={emailUpdates}
                    onCheckedChange={(checked) => handleNotificationChange("email", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Appearance Section */}
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-foreground">Appearance</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Customize how the app looks and feels
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {isDarkMode ? (
                        <Moon className="h-4 w-4 text-yellow-400" />
                      ) : (
                        <Sun className="h-4 w-4 text-gray-700" />
                      )}
                      <h4 className="font-medium text-gray-900 dark:text-yellow-400">Dark Mode</h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Switch to dark theme for better viewing in low light
                    </p>
                  </div>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={handleDarkModeChange}
                    className="data-[state=checked]:bg-yellow-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone Section */}
            <Card className="border-red-200 dark:border-red-800 bg-white dark:bg-gray-700">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-gray-900 dark:text-yellow-400">
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          This action cannot be undone. This will permanently delete your account and remove all your
                          data from our servers including:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>Your profile information</li>
                            <li>Order history</li>
                            <li>Wishlist items</li>
                            <li>Saved addresses</li>
                            <li>All account preferences</li>
                          </ul>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="text-gray-900 dark:text-yellow-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          {/* Back to Home */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full sm:w-auto text-gray-900 dark:text-yellow-400 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
