"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'

export interface Address {
  id: string
  address_line_1: string
  city: string
  state: string
  postal_code: string
  country: string
  barangay?: string
  shipping_region?: string
  is_default: boolean
  created_at?: string
  updated_at?: string
}

export function useAddresses() {
  const { user, tokenReady } = useAuth()
  const { toast } = useToast()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAddresses = useCallback(async () => {
    if (!user || !tokenReady) {
      setAddresses([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setAddresses([])
        setLoading(false)
        return
      }

      const response = await fetch('/api/addresses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to load addresses')
      }

      const data = await response.json()
      setAddresses(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load addresses'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [user, tokenReady, toast])

  // Automatically fetch addresses when user or tokenReady changes
  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  const createAddress = useCallback(async (addressData: Omit<Address, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user || !tokenReady) {
      throw new Error('User not authenticated')
    }

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create address')
      }

      const newAddress = await response.json()
      
      // Refresh the addresses list
      await fetchAddresses()
      
      toast({
        title: 'Success',
        description: 'Address created successfully',
        variant: 'default',
      })

      return newAddress
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create address'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, tokenReady, fetchAddresses, toast])

  const updateAddress = useCallback(async (id: string, addressData: Partial<Address>) => {
    if (!user || !tokenReady) {
      throw new Error('User not authenticated')
    }

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`/api/addresses?id=${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update address')
      }

      const updatedAddress = await response.json()
      
      // Refresh the addresses list
      await fetchAddresses()
      
      toast({
        title: 'Success',
        description: 'Address updated successfully',
        variant: 'default',
      })

      return updatedAddress
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update address'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, tokenReady, fetchAddresses, toast])

  const deleteAddress = useCallback(async (id: string) => {
    if (!user || !tokenReady) {
      throw new Error('User not authenticated')
    }

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Authentication token not found')
      }

      const response = await fetch(`/api/addresses?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete address')
      }

      // Refresh the addresses list
      await fetchAddresses()
      
      toast({
        title: 'Success',
        description: 'Address deleted successfully',
        variant: 'default',
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete address'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, tokenReady, fetchAddresses, toast])

  const getDefaultAddress = useCallback(() => {
    return addresses.find(addr => addr.is_default) || addresses[0] || null
  }, [addresses])

  return {
    addresses,
    loading,
    error,
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    getDefaultAddress,
    hasAddresses: addresses.length > 0
  }
}