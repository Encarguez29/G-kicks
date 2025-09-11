"use client"

export const dynamic = 'force-dynamic'


import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAdmin } from "@/contexts/admin-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, User, ShoppingBag, Eye, EyeOff, CreditCard, Shield } from "lucide-react"
import Image from "next/image"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { state, login } = useAdmin()
  const router = useRouter()

  useEffect(() => {
    if (state.isAuthenticated) {
      router.push("/admin")
    }
  }, [state.isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    const success = await login(email, password)
    if (!success) {
      setError("Invalid email or password, or insufficient permissions")
    }
  }

  const fillDemoCredentials = (role: "admin" | "staff" | "cashier") => {
    if (role === "admin") {
      setEmail("gkcksdmn@gmail.com")
      setPassword("admingkicks2.0")
    } else if (role === "staff") {
      setEmail("gkicksstaff@gmail.com")
      setPassword("gkicksstaff_123")
    } else {
      setEmail("cashier@gkicks.com")
      setPassword("cashier123")
    }
    setError("")
  }

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
          <span className="text-yellow-400">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-primary rounded-xl flex items-center justify-center p-2">
              <Image
                src="/images/gkicks-transparent-logo.png"
                alt="GKicks Admin"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-yellow-400">GKicks Admin Portal</h2>
          <p className="mt-2 text-yellow-200">Sign in to your admin account</p>
        </div>

        {/* Demo Credentials */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Demo Credentials</CardTitle>
            <CardDescription className="text-muted-foreground">Click to auto-fill login credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="admin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Admin
                </TabsTrigger>
                <TabsTrigger value="staff" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Staff
                </TabsTrigger>
                <TabsTrigger
                  value="cashier"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Cashier
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin" className="space-y-4">
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-destructive text-destructive-foreground font-semibold">Administrator</Badge>
                    <Shield className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-foreground">
                      <strong>Email:</strong> gkcksdmn@gmail.com
                    </p>
                    <p className="text-foreground">
                      <strong>Password:</strong> admingkicks2.0
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-destructive/30">
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Full Access:</strong>
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="outline" className="text-xs border-destructive text-destructive">
                        Products
                      </Badge>
                      <Badge variant="outline" className="text-xs border-destructive text-destructive">
                        Orders
                      </Badge>
                      <Badge variant="outline" className="text-xs border-destructive text-destructive">
                        Analytics
                      </Badge>
                      <Badge variant="outline" className="text-xs border-destructive text-destructive">
                        POS
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Administrator has access to all features and settings</p>
                  </div>
                  <Button
                    onClick={() => fillDemoCredentials("admin")}
                    className="w-full mt-3 font-semibold"
                  >
                    Use Admin Credentials
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="staff" className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-primary text-primary-foreground font-semibold">Staff Member</Badge>
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-foreground">
                      <strong>Email:</strong> gkicksstaff@gmail.com
                    </p>
                    <p className="text-foreground">
                      <strong>Password:</strong> gkicksstaff_123
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/30">
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>Limited Access:</strong>
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        <ShoppingBag className="h-3 w-3 mr-1" />
                        Orders
                      </Badge>
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        <CreditCard className="h-3 w-3 mr-1" />
                        POS
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Staff can manage orders and process sales</p>
                  </div>
                  <Button
                    onClick={() => fillDemoCredentials("staff")}
                    className="w-full mt-3 font-semibold"
                  >
                    Use Staff Credentials
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="cashier" className="space-y-4">
                <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/30">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-secondary text-secondary-foreground font-semibold">Cashier</Badge>
                    <CreditCard className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-foreground">
                      <strong>Email:</strong> cashier@gkicks.com
                    </p>
                    <p className="text-foreground">
                      <strong>Password:</strong> cashier123
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-secondary/30">
                    <p className="text-xs text-muted-foreground mb-2">
                      <strong>POS Only:</strong>
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs border-secondary text-secondary">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Sales Only
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Cashier can only process sales transactions</p>
                  </div>
                  <Button
                    onClick={() => fillDemoCredentials("cashier")}
                    className="w-full mt-3 font-semibold"
                  >
                    Use Cashier Credentials
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Login Form */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-primary">Sign In</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your credentials to access the admin portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input border-border text-foreground placeholder-muted-foreground focus:border-ring"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-input border-border text-foreground placeholder-muted-foreground focus:border-ring"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive">
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full font-semibold"
                disabled={state.isLoading}
              >
                {state.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Staff Portal Link */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground text-sm">Looking for staff access?</p>
              <Button
                variant="outline"
                onClick={() => router.push("/admin/staff-login")}
                className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Go to Staff Portal
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back to Store */}
        <div className="text-center">
          <Button variant="link" onClick={() => router.push("/")} className="text-primary hover:text-primary/80">
            ← Back to Store
          </Button>
        </div>
      </div>
    </div>
  )
}
