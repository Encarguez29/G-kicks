"use client"

import type React from "react"
import { SessionProvider } from "next-auth/react"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { CartProvider } from "@/contexts/cart-context"
import { WishlistProvider } from "@/contexts/wishlist-context"
import { OrdersProvider } from "@/contexts/orders-context"
// SupabaseAuthProvider removed - now using MySQL-based AuthProvider
import { AdminProvider } from "@/contexts/admin-context"
import { AuthProvider } from "@/contexts/auth-context" // Adjust import path
import ClientOnly from "@/components/client-only"
import ErrorBoundary from "@/components/error-boundary"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <SessionProvider 
          refetchInterval={0}
          refetchOnWindowFocus={false}
          refetchWhenOffline={false}
        >
          <ClientOnly fallback={<div>Loading...</div>}>
            <AuthProvider>
              <AdminProvider>
                <CartProvider>
                  <WishlistProvider>
                    <OrdersProvider>
                      {children}
                      <Toaster />
                    </OrdersProvider>
                  </WishlistProvider>
                </CartProvider>
              </AdminProvider>
            </AuthProvider>
          </ClientOnly>
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
