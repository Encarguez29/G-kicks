"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useAdmin } from "@/contexts/admin-context"
import { Menu, X, Home, Package, ShoppingCart, BarChart3, Calculator, User, Settings, LogOut, Shield, Archive, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AdminNotifications } from "@/components/admin-notifications"
import { AdminMessages } from "@/components/admin-messages"
// Removed Supabase auth - using local authentication

export function AdminHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { signOut } = useAuth()
  
  // Mock user data - replace with actual auth
  const user = { email: 'admin@gkicks.com' }
  const profile = { first_name: 'Admin', last_name: 'User' }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Check user role using admin context
  const { state: adminState, hasPermission, isAdmin, isStaff } = useAdmin()
  const isFullAdmin = isAdmin()
  const isStaffUser = isStaff()

  const getUserDisplayName = () => {
    if (isFullAdmin) return "ADMIN GKICKS"
    if (isStaffUser) return "STAFF GKICKS"
    return profile?.first_name || user?.email?.split("@")[0] || "User"
  }

  // Filter navigation items based on user permissions
  const allNavigationItems = [
    { href: "/admin", icon: Home, label: "Dashboard", active: pathname === "/admin", permission: "dashboard" },
    { href: "/admin/inventory", icon: Package, label: "Products", active: pathname === "/admin/inventory", permission: "inventory" },
    { href: "/admin/orders", icon: ShoppingCart, label: "Orders", active: pathname === "/admin/orders", permission: "orders" },
    { href: "/admin/carousel", icon: Settings, label: "Carousel", active: pathname === "/admin/carousel", permission: "carousel" },
    { href: "/admin/analytics", icon: BarChart3, label: "Analytics", active: pathname === "/admin/analytics", permission: "analytics" },
    { href: "/admin/pos", icon: Calculator, label: "POS", active: pathname === "/admin/pos", permission: "pos" },
    { href: "/admin/users", icon: User, label: "Users", active: pathname === "/admin/users", permission: "users" },
    { href: "/admin/archive", icon: Archive, label: "Archive", active: pathname === "/admin/archive", permission: "archive" },
    { href: "/admin/backup", icon: Shield, label: "Backup", active: pathname === "/admin/backup", permission: "backup" },
  ]
  
  const navigationItems = allNavigationItems.filter(item => {
    // Admin has access to all items
    if (isFullAdmin) return true
    // Staff has access to orders, POS, and archive
    if (isStaffUser) return item.permission === 'orders' || item.permission === 'pos' || item.permission === 'archive'
    return false
  })

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex justify-between items-center h-16">
          {/* Empty space for logo removal */}
          <div></div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  item.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <AdminNotifications />
            
            {/* Messages */}
            <AdminMessages />
            
            {/* Back to Store */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden sm:flex"
            >
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Back to Store
              </Link>
            </Button>

            {/* User dropdown removed */}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border py-2">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    item.active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              ))}
              <Link
                href="/"
                className="flex items-center px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="h-5 w-5 mr-3" />
                Back to Store
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
