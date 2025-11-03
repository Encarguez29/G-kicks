'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from 'next-themes'

export default function VerifyCodePage() {
  const [verificationCode, setVerificationCode] = useState('')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    // Get email from URL params if available
    const emailParam = searchParams?.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')

    if (!email || !verificationCode) {
      toast({
        title: "Error",
        description: "Please enter both email and verification code",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      toast({
        title: "Error",
        description: "Verification code must be 6 digits",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          verificationCode: verificationCode.trim()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        toast({
          title: "Success",
          description: "Email verified successfully! Redirecting to sign in...",
        })
        setTimeout(() => {
          router.push(`/auth?email=${encodeURIComponent(email)}`)
        }, 2000)
      } else {
        toast({
          title: "Error",
          description: data.error || 'Verification failed',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Verification error:', error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "New verification code sent to your email!",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to resend verification code',
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Resend error:', error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-yellow-400">Loading...</p>
      </div>
    )
  }

  const isDark = resolvedTheme === "dark"

  if (isSuccess) {
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
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Email Verified!</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Your email has been successfully verified. Redirecting to homepage...
            </p>
          </div>
        </div>
      </div>
    )
  }

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
          <h2 className="text-xl font-bold text-yellow-400 mb-2">Verify Your Email</h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Enter the 6-digit code sent to your email address
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            />
          </div>

          <div>
            <label htmlFor="verificationCode" className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Verification Code
            </label>
            <Input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`w-full focus:border-yellow-400 focus:ring-yellow-400 text-center text-2xl font-mono tracking-widest ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
              placeholder="000000"
              maxLength={6}
              required
            />
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Enter the 6-digit code from your email</p>
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            disabled={isLoading || !email || !verificationCode}
          >
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Didn't receive the code?</p>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isLoading || !email}
            className={`text-sm underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Resend verification code
          </button>
        </div>

        <div className="mt-4 text-center pt-4 border-t border-gray-200">
          <Link href="/auth" className={`text-sm underline ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}