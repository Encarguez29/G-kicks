'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from 'next-themes'
import { Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Enter code, 2: Set new password
  const [passwordStrength, setPasswordStrength] = useState<string>("")
  const [passwordCriteria, setPasswordCriteria] = useState({ 
    length: false, 
    lower: false, 
    upper: false, 
    special: false 
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    
    // Pre-fill email if provided in URL parameters
    const emailParam = searchParams?.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  // Compute password criteria and strength as the user types
  useEffect(() => {
    const length = newPassword.length >= 8
    const lower = /[a-z]/.test(newPassword)
    const upper = /[A-Z]/.test(newPassword)
    const special = /[^A-Za-z0-9]/.test(newPassword)
    setPasswordCriteria({ length, lower, upper, special })
    const score = [length, lower, upper, special].filter(Boolean).length
    if (!newPassword) {
      setPasswordStrength("")
    } else if (score <= 2) {
      setPasswordStrength("Weak")
    } else if (score === 3) {
      setPasswordStrength("Moderate")
    } else {
      setPasswordStrength("Strong")
    }
  }, [newPassword])

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !code) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Code verified! Now set your new password.",
        })
        setStep(2)
      } else {
        toast({
          title: "Error",
          description: data.error || "Invalid or expired code.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Code verification error:", error)
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      })
      return
    }

    // Enforce password policy
    const lengthOk = newPassword.length >= 8
    const lowerOk = /[a-z]/.test(newPassword)
    const upperOk = /[A-Z]/.test(newPassword)
    const specialOk = /[^A-Za-z0-9]/.test(newPassword)
    if (!(lengthOk && lowerOk && upperOk && specialOk)) {
      toast({
        title: "Password requirements not met",
        description: "Use at least 8 characters with lowercase (a), uppercase (A), and a special character.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password-with-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, newPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password reset successfully! Redirecting to sign in...",
        })
        
        setTimeout(() => {
          router.push(`/auth?email=${encodeURIComponent(email)}`)
        }, 2000)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to reset password.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Password reset error:", error)
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-yellow-400">Loading...</p>
      </div>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-background p-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
      <div className="text-center mb-8">
        <Image 
          src="/images/gkicks-transparent-logo.png" 
          alt="GKicks Logo" 
          width={100} 
          height={100} 
          className="mx-auto mb-4" 
        />
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">Reset Your Password</h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          {step === 1 
            ? 'Enter the verification code sent to your email' 
            : 'Create a new password for your account'
          }
        </p>
      </div>

      <div className={`w-full max-w-md rounded-lg shadow-lg p-6 sm:p-8 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-2">
            {step === 1 ? "Verify Code" : "Set New Password"}
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {step === 1 
              ? 'Enter the 6-digit code we sent to your email' 
              : 'Choose a strong password for your account'
            }
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="email" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full focus:border-yellow-400 focus:ring-yellow-400 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                placeholder="Enter your email"
                required
                disabled
              />
            </div>

            <div>
              <label htmlFor="code" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Verification Code
              </label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`w-full focus:border-yellow-400 focus:ring-yellow-400 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                placeholder="Enter 6-digit code"
                maxLength={6}
                pattern="[0-9]{6}"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                New Password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full focus:border-yellow-400 focus:ring-yellow-400 pr-10 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  placeholder="Enter new password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 focus:outline-none ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className={`mt-1 h-1 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div className={`h-1 rounded transition-all duration-200 ${
                    passwordStrength === 'Weak' ? 'w-1/3 bg-red-500' : 
                    passwordStrength === 'Moderate' ? 'w-2/3 bg-orange-400' : 
                    'w-full bg-green-500'
                  }`}></div>
                </div>
              )}
              {newPassword.length > 0 && (
                <div className="mt-2">
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <li className={`${passwordCriteria.length ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>• 8+ characters</li>
                    <li className={`${passwordCriteria.lower ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>• Lowercase letter (a)</li>
                    <li className={`${passwordCriteria.upper ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>• Uppercase letter (A)</li>
                    <li className={`${passwordCriteria.special ? (isDark ? 'text-green-400' : 'text-green-600') : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>• Special character (!@#$%^&*)</li>
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full focus:border-yellow-400 focus:ring-yellow-400 pr-10 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  placeholder="Confirm new password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 focus:outline-none ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/auth')}
            className={`text-yellow-400 hover:text-yellow-300 text-sm transition-colors ${isDark ? 'hover:text-yellow-300' : 'hover:text-yellow-600'}`}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  )
}