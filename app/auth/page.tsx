"use client"

export const dynamic = 'force-dynamic'


import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { Eye, EyeOff, Mail } from "lucide-react"

export default function AuthPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [showForgotEmailModal, setShowForgotEmailModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [showForgotEmailRecoveryModal, setShowForgotEmailRecoveryModal] = useState(false)
  const [forgotEmailRecovery, setForgotEmailRecovery] = useState('')
  const [forgotEmailError, setForgotEmailError] = useState<string | null>(null)
  const [forgotEmailSuccess, setForgotEmailSuccess] = useState<string | null>(null)
  const [forgotEmailLoading, setForgotEmailLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showForgotEmail, setShowForgotEmail] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  // Password strength tracking
  const [passwordStrength, setPasswordStrength] = useState<string>("")
  const [passwordCriteria, setPasswordCriteria] = useState({ length: false, lower: false, upper: false, special: false })

  useEffect(() => {
    setMounted(true)
    
    // Pre-fill email if provided in URL parameters
    const emailParam = searchParams?.get('email')
    if (emailParam) {
      setEmail(emailParam)
      setIsSignUp(false) // Switch to sign-in mode when email is pre-filled
    }
  }, [searchParams])

  useEffect(() => {
    if (user && !loading) {
      // Only redirect if user is already logged in when visiting the auth page
      // Don't redirect during the login process as that's handled in handleSubmit
      if (user.email === "gkcksdmn@gmail.com") {
        window.location.href = "/admin"
      } else if (user.email === "gkicksstaff@gmail.com") {
        window.location.href = "/admin/orders"
      } else {
        window.location.href = "/"
      }
    }
  }, [user, loading])

  // Compute password criteria and strength as the user types
  useEffect(() => {
    const length = password.length >= 8
    const lower = /[a-z]/.test(password)
    const upper = /[A-Z]/.test(password)
    const special = /[^A-Za-z0-9]/.test(password)
    setPasswordCriteria({ length, lower, upper, special })
    const score = [length, lower, upper, special].filter(Boolean).length
    if (!password) {
      setPasswordStrength("")
    } else if (score <= 2) {
      setPasswordStrength("Weak")
    } else if (score === 3) {
      setPasswordStrength("Moderate")
    } else {
      setPasswordStrength("Strong")
    }
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (isSignUp && (!firstName || !lastName)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    if (isSignUp && password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      })
      return
    }

    // Enforce password policy for sign-up
    if (isSignUp) {
      const lengthOk = password.length >= 8
      const lowerOk = /[a-z]/.test(password)
      const upperOk = /[A-Z]/.test(password)
      const specialOk = /[^A-Za-z0-9]/.test(password)
      if (!(lengthOk && lowerOk && upperOk && specialOk)) {
        toast({
          title: "Password requirements not met",
          description: "Use at least 8 characters with lowercase (a), uppercase (A), and a special character.",
          variant: "destructive",
        })
        return
      }
    }

    try {
      const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login'
      const body = isSignUp 
        ? { email, password, firstName, lastName }
        : { email, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        // Reset failed attempts on successful login
        setFailedAttempts(0)
        setShowForgotPassword(false)
        setShowForgotEmail(false)
        
        // Store auth token first
        if (data.token) {
          localStorage.setItem('auth_token', data.token)
        }
        
        toast({
          title: "Success",
          description: isSignUp ? "Account created successfully!" : "Signed in successfully!",
        })
        
        // After successful sign up, handle email verification flow
        if (isSignUp) {
          if (data.requiresVerification) {
            toast({
              title: "Registration Successful!",
              description: "We sent a verification code to your email. Redirecting to verification page...",
            })
            // Redirect to verification page with email parameter
            setTimeout(() => {
              router.push(`/verify-code?email=${encodeURIComponent(email)}`)
            }, 1500)
          } else {
            // Switch to sign-in form and keep email for convenience
            setIsSignUp(false)
            setFirstName("")
            setLastName("")
            setConfirmPassword("")
            // Clear the password to avoid unintended autofill
            setPassword("")
          }
        } else {
          // Immediate redirect based on user role using window.location for instant navigation
          if (data.user?.email === "gkcksdmn@gmail.com") {
            window.location.href = "/admin"
          } else if (data.user?.email === "gkicksstaff@gmail.com") {
            window.location.href = "/admin/orders"
          } else {
            window.location.href = "/"
          }
        }
      } else {
        // Handle specific error cases
        if (data.requiresVerification) {
          toast({
            title: "Email Verification Required",
            description: data.message || "Please verify your email address before signing in.",
            variant: "destructive",
          })
          // Optionally redirect to a resend verification page or show resend option
        } else if (isSignUp && data.requiresVerification !== undefined) {
          toast({
            title: "Registration Successful!",
            description: "We sent a verification code to your email. Redirecting to verification page...",
          })
          // Redirect to verification page with email parameter
          setTimeout(() => {
            router.push(`/verify-code?email=${encodeURIComponent(email)}`)
          }, 1500)
        } else if (isSignUp && response.status === 409) {
          // User already exists - suggest signing in instead
          toast({
            title: "Account Already Exists",
            description: "An account with this email already exists. Please sign in instead or use a different email.",
            variant: "destructive",
          })
          // Switch to sign in mode
          setIsSignUp(false)
        } else {
          // Increment failed attempts for login failures
          if (!isSignUp) {
            const newFailedAttempts = failedAttempts + 1
            setFailedAttempts(newFailedAttempts)
            
            // Show forgot options after 5 failed attempts
            if (newFailedAttempts >= 5) {
              setShowForgotPassword(true)
              setShowForgotEmail(true)
            }
          }
          
          toast({
            title: "Error",
            description: data.message || data.error || "Authentication failed. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Authentication error:", error)
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError(null)
    setForgotSuccess(null)
    setForgotLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect to reset password page with email parameter
        window.location.href = `/reset-password?email=${encodeURIComponent(forgotEmail)}`
      } else {
        setForgotError(data.error || 'Failed to send reset code')
      }
    } catch (error) {
      setForgotError('An error occurred. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleForgotEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotEmailError(null)
    setForgotEmailSuccess(null)
    setForgotEmailLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmailRecovery }),
      })

      const data = await response.json()

      if (response.ok) {
        setForgotEmailSuccess(data.message)
        setForgotEmailRecovery('')
      } else {
        setForgotEmailError(data.error || 'Failed to recover email')
      }
    } catch (error) {
      setForgotEmailError('An error occurred. Please try again.')
    } finally {
      setForgotEmailLoading(false)
    }
  }

  if (loading || !mounted) {
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
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">Welcome to GKicks</h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Your premium sneaker destination</p>
      </div>

      <div className={`w-full max-w-md rounded-lg shadow-lg p-6 sm:p-8 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-yellow-400 mb-2">{isSignUp ? "Create Account" : "Sign In"}</h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {isSignUp ? "Create your account to get started" : "Sign in with your account to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  First Name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full focus:border-yellow-400 focus:ring-yellow-400 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  placeholder="First name"
                  required={isSignUp}
                />
              </div>
              <div>
                <label htmlFor="lastName" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Last Name
                </label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`w-full focus:border-yellow-400 focus:ring-yellow-400 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  placeholder="Last name"
                  required={isSignUp}
                />
              </div>
            </div>
          )}
          
          <div>
            <label htmlFor="email" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full focus:border-yellow-400 focus:ring-yellow-400 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full focus:border-yellow-400 focus:ring-yellow-400 pr-10 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                placeholder="Enter your password"
                required
                minLength={isSignUp ? 8 : undefined}
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
            {isSignUp && password.length > 0 && (
               <div className={`mt-1 h-1 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                 <div className={`h-1 rounded transition-all duration-200 ${passwordStrength === 'Weak' ? 'w-1/3 bg-red-500' : passwordStrength === 'Moderate' ? 'w-2/3 bg-orange-400' : 'w-full bg-green-500'}`}></div>
               </div>
             )}
            {isSignUp && password.length > 0 && (
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

          {isSignUp && (
            <div>
              <label htmlFor="confirmPassword" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full focus:border-yellow-400 focus:ring-yellow-400 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                  placeholder="Confirm your password"
                  required={isSignUp}
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
          )}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            disabled={loading}
          >
            {loading ? "Please wait..." : (isSignUp ? "Create account" : "Next")}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              // Reset failed attempts when switching modes
              setFailedAttempts(0)
              setShowForgotPassword(false)
              setShowForgotEmail(false)
            }}
            className={`text-sm underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Create one"}
          </button>
        </div>

        {!isSignUp && (
          <div className="mt-4 text-center space-y-2">
            {showForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setShowForgotEmailModal(true)
                  setShowForgotPassword(false)
                  // Pre-fill the email field with current email value
                  setForgotEmail(email)
                }}
                className="text-blue-400 hover:text-blue-300 text-sm underline bg-transparent border-none cursor-pointer block mx-auto"
              >
                Forgot password?
              </button>
            )}
            {showForgotEmail && (
              <button
                type="button"
                onClick={async () => {
                  setForgotEmailLoading(true)
                  await new Promise(resolve => setTimeout(resolve, 500))
                  setShowForgotEmailRecoveryModal(true)
                  // Pre-fill the email field with current email value
                  setForgotEmailRecovery(email)
                  setForgotEmailLoading(false)
                }}
                disabled={forgotEmailLoading}
                className={`text-blue-400 hover:text-blue-300 text-sm underline bg-transparent border-none cursor-pointer block mx-auto transition-opacity ${
                  forgotEmailLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {forgotEmailLoading ? 'Loading...' : 'Forgot email?'}
              </button>
            )}
          </div>
        )}

      </div>

      {/* Forgot Email Modal */}
      {showForgotEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Reset Your Password</h3>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-300 text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  required
                />
              </div>
              {forgotError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{forgotError}</p>
                </div>
              )}
              {forgotSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400 text-sm">{forgotSuccess}</p>
                </div>
              )}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-400 text-sm">
                  💡 <strong>Note:</strong> If an account exists with this email, you'll receive a password reset code.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    setShowForgotEmailModal(false)
                    setForgotEmail('')
                    setForgotError(null)
                    setForgotSuccess(null)
                  }}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {forgotLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Code'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Email Recovery Modal */}
      {showForgotEmailRecoveryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Recover Your Email</h3>
            <p className="text-gray-300 text-sm mb-4">
              Enter your email address to receive account recovery information.
            </p>
            <form onSubmit={handleForgotEmailRecovery} className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-300 text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={forgotEmailRecovery}
                  onChange={(e) => setForgotEmailRecovery(e.target.value)}
                  placeholder="Enter your email address"
                  className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500"
                  required
                />
              </div>
              {forgotEmailError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{forgotEmailError}</p>
                </div>
              )}
              {forgotEmailSuccess && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-green-400 text-sm">{forgotEmailSuccess}</p>
                </div>
              )}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <p className="text-orange-400 text-sm">
                  📧 <strong>Note:</strong> We'll send account recovery information to this email address if it exists in our system.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    setShowForgotEmailRecoveryModal(false)
                    setForgotEmailRecovery('')
                    setForgotEmailError(null)
                    setForgotEmailSuccess(null)
                  }}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotEmailLoading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {forgotEmailLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Recovering...
                    </div>
                  ) : (
                    'Recover Email'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
