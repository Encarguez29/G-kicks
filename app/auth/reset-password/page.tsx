"use client"

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { resolvedTheme } = useTheme()
  const token = searchParams?.get('token')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
      setTokenValid(false)
      return
    }

    // Validate token on page load
    validateToken(token)
  }, [token])

  const validateToken = async (resetToken: string) => {
    try {
      const response = await fetch(`/api/auth/reset-password?token=${resetToken}`)
      const data = await response.json()
      
      if (data.valid) {
        setTokenValid(true)
      } else {
        setError(data.error || 'Invalid or expired reset token')
        setTokenValid(false)
      }
    } catch (error) {
      setError('Failed to validate reset token')
      setTokenValid(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        toast({
          title: "Success!",
          description: "Your password has been reset successfully.",
        })
        
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/auth')
        }, 3000)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md border border-border">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Validating reset token...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state while theme is being resolved
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4 w-48"></div>
          <div className="h-4 bg-muted rounded mb-8 w-32"></div>
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const isDark = resolvedTheme === "dark"

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md border border-border">
          <div className="text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-4 text-foreground">Invalid Reset Link</h1>
            <p className="mb-6 text-muted-foreground">{error}</p>
            <Button 
              onClick={() => router.push('/auth')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md border border-border">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-bold mb-4 text-foreground">Password Reset Successful!</h1>
            <p className="mb-6 text-muted-foreground">Your password has been updated successfully. You will be redirected to the login page shortly.</p>
            <Button 
              onClick={() => router.push('/auth')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background/95 backdrop-blur flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md space-y-6 bg-card/80 backdrop-blur-sm border border-border rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2 text-foreground">Reset Your Password</h1>
          <p className="text-muted-foreground">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="border rounded-lg p-3 bg-destructive/10 border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                className="pl-10 pr-10 bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirm New Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="pl-10 pr-10 bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Resetting Password...
              </div>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>

        {/* Back to Login */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/auth')}
            className="text-sm transition-colors text-muted-foreground hover:text-primary"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  )
}