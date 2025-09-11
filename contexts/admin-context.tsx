"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./auth-context"

interface AdminUser {
  id: string
  email: string
  role: "admin" | "staff" | "cashier"
  permissions: Record<string, boolean> | { all: boolean }
  is_active: boolean
  created_at: string
}

interface AdminState {
  user: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AdminContextType {
  state: AdminState
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  isAdmin: () => boolean
  isStaff: () => boolean
  isCashier: () => boolean
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  const { user: authUser, login: signIn, logout: signOut } = useAuth()

  // Check if current authenticated user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!authUser?.email) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
        return
      }

      try {
        console.log("Checking admin status for:", authUser.email)

        // Check if user is admin using MySQL API
        const response = await fetch('/api/admin/check-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: authUser.email }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log("Admin user found:", data.user)
          
          // JWT token is already handled by the main auth system
          console.log('✅ Admin status verified, using existing JWT token')
          
          setState({
            user: data.user,
            isLoading: false,
            isAuthenticated: true,
          })
        } else {
          console.log("User is not an admin")
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          })
        }
      } catch (error) {
        console.error("Error checking admin status:", error)
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
      }
    }

    checkAdminStatus()
  }, [authUser])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }))
      console.log("Attempting admin login for:", email)

      // Use direct email/password login API
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json()
        console.error("Login failed:", errorData.error)
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
      }

      const loginData = await loginResponse.json()
      console.log("Login successful, checking admin status...")
      
      // Store the auth token in localStorage for API calls
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', loginData.token)
      }

      // Check if user is an admin using MySQL API
      const adminResponse = await fetch('/api/admin/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!adminResponse.ok) {
        console.error("Admin check error: User is not an admin")
        // Clear the token if not an admin
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
        }
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
        return false
      }

      const adminData = await adminResponse.json()
      console.log("Admin login successful:", adminData.user)
      
      setState({
        user: adminData.user,
        isLoading: false,
        isAuthenticated: true,
      })
      return true
    } catch (error) {
      console.error("Login error:", error)
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }

  const logout = async () => {
    try {
      // Clear JWT token from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem('auth_token')
        console.log('🗑️ Admin JWT token cleared from localStorage')
      }
      
      await signOut()
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!state.user) return false

    // Admin has all permissions
    if (state.user.role === "admin") return true

    // Check if permissions object has 'all' permission
    if (typeof state.user.permissions === 'object' && 'all' in state.user.permissions && state.user.permissions.all) {
      return true
    }

    // Check specific permissions in the permissions object
    if (typeof state.user.permissions === 'object' && permission in state.user.permissions) {
      return 'all' in state.user.permissions 
        ? false 
        : (state.user.permissions as Record<string, boolean>)[permission] === true
    }

    return false
  }

  const isAdmin = (): boolean => {
    return state.user?.role === "admin" || false
  }

  const isStaff = (): boolean => {
    return state.user?.role === "staff" || false
  }

  const isCashier = (): boolean => {
    return state.user?.role === "cashier" || false
  }

  const value: AdminContextType = {
    state,
    login,
    logout,
    hasPermission,
    isAdmin,
    isStaff,
    isCashier,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    console.error("useAdmin must be used within an AdminProvider")
    // Return a default context instead of throwing to prevent crashes
    return {
      state: {
        user: null,
        isLoading: false,
        isAuthenticated: false,
      },
      login: async () => false,
      logout: async () => {},
      hasPermission: () => false,
      isAdmin: () => false,
      isStaff: () => false,
      isCashier: () => false,
    }
  }
  return context
}
