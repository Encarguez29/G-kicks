"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  size: string
  quantity: number
  color?: string;
  brand?: string;
}

interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
}

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "quantity"> }
  | { type: "REMOVE_ITEM"; payload: { id: string; size: string } }
  | { type: "UPDATE_QUANTITY"; payload: { id: string; size: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; payload: { items: CartItem[]; total: number; itemCount: number } }

const CartContext = createContext<{
  state: CartState
  dispatch: React.Dispatch<CartAction>
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  removeItem: (id: string, size: string) => void
  updateQuantity: (id: string, size: string, quantity: number) => void
  clearCart: () => void
} | null>(null)

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItemIndex = state.items.findIndex(
        (item) => item.id === action.payload.id && item.size === action.payload.size,
      )

      let newItems: CartItem[]
      if (existingItemIndex > -1) {
        newItems = state.items.map((item, index) =>
          index === existingItemIndex ? { ...item, quantity: item.quantity + 1 } : item,
        )
      } else {
        newItems = [...state.items, { ...action.payload, quantity: 1 }]
      }

      const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const newItemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)

      return {
        items: newItems,
        total: newTotal,
        itemCount: newItemCount,
      }
    }

    case "REMOVE_ITEM": {
      const newItems = state.items.filter(
        (item) => !(item.id === action.payload.id && item.size === action.payload.size),
      )
      const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const newItemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)

      return {
        items: newItems,
        total: newTotal,
        itemCount: newItemCount,
      }
    }

    case "UPDATE_QUANTITY": {
      const newItems = state.items
        .map((item) =>
          item.id === action.payload.id && item.size === action.payload.size
            ? { ...item, quantity: Math.max(0, action.payload.quantity) }
            : item,
        )
        .filter((item) => item.quantity > 0)

      const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const newItemCount = newItems.reduce((sum, item) => sum + item.quantity, 0)

      return {
        items: newItems,
        total: newTotal,
        itemCount: newItemCount,
      }
    }

    case "CLEAR_CART":
      return {
        items: [],
        total: 0,
        itemCount: 0,
      }

    case "LOAD_CART":
      return {
        items: action.payload.items,
        total: action.payload.total,
        itemCount: action.payload.itemCount,
      }

    default:
      return state
  }
}

const getInitialState = (): CartState => {
  // Always return empty state initially to prevent hydration mismatch
  // Cart will be loaded from localStorage in useEffect after hydration
  return {
    items: [],
    total: 0,
    itemCount: 0,
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, getInitialState())
  const { user, loading } = useAuth()
  const isAuthenticated = !!user && !loading
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  // Sync localStorage cart to database when user logs in
  const syncCartToDatabase = async (localCartItems: CartItem[]) => {
    if (!token || localCartItems.length === 0) return
    
    console.log('🔄 Syncing localStorage cart to database:', localCartItems)
    
    try {
      // Add each item from localStorage to database
      for (const item of localCartItems) {
        await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: item.id,
            size: item.size,
            color: item.color,
            quantity: item.quantity
          }),
        })
      }
      
      console.log('✅ Cart sync completed')
    } catch (error) {
      console.error('❌ Error syncing cart to database:', error)
    }
  }

  // Clear cart when user changes (logout or account switch)
  useEffect(() => {
    const currentUserId = user?.id
    const previousUserId = typeof window !== 'undefined' ? localStorage.getItem('previous_user_id') : null
    
    if (previousUserId && currentUserId !== previousUserId) {
      // User changed, clear cart
      dispatch({ type: "CLEAR_CART" })
      // Also clear localStorage cart data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gkicks-cart')
      }
      console.log('🔄 Cart cleared due to user change')
    }
    
    // If user logged out (currentUserId is null but previousUserId exists)
    if (!currentUserId && previousUserId) {
      dispatch({ type: "CLEAR_CART" })
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gkicks-cart')
      }
      console.log('🔄 Cart cleared due to logout')
    }
    
    // Update stored user ID
    if (typeof window !== 'undefined') {
      if (currentUserId) {
        localStorage.setItem('previous_user_id', currentUserId)
      } else {
        localStorage.removeItem('previous_user_id')
      }
    }
  }, [user?.id])

  // Load cart from API for authenticated users or localStorage for guests
  useEffect(() => {
    const loadCart = async () => {
      if (isAuthenticated && token) {
        // Check if there's a localStorage cart to sync
        let localCartData = null
        if (typeof window !== "undefined") {
          const savedCart = localStorage.getItem("gkicks-cart")
          if (savedCart) {
            try {
              localCartData = JSON.parse(savedCart)
            } catch (error) {
              console.error("Error parsing localStorage cart:", error)
            }
          }
        }
        
        // Sync localStorage cart to database if it exists
        if (localCartData && localCartData.items && localCartData.items.length > 0) {
          await syncCartToDatabase(localCartData.items)
        }
        
        try {
          const response = await fetch('/api/cart', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          
          if (response.ok) {
            const cartItems = await response.json()
            console.log('🛒 Cart data from API:', cartItems)
            
            // Calculate totals
            const total = cartItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
            const itemCount = cartItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)
            
            dispatch({ type: "LOAD_CART", payload: { items: cartItems, total, itemCount } })
            
            // Clear localStorage to prevent conflicts with database data
            if (typeof window !== "undefined") {
              localStorage.removeItem("gkicks-cart")
            }
          } else {
            console.error('Failed to load cart from API:', response.status)
          }
        } catch (error) {
          console.error("Error loading cart from API:", error)
        }
      } else {
        // Load from localStorage for non-authenticated users after hydration
        if (typeof window !== "undefined") {
          try {
            const savedCart = localStorage.getItem("gkicks-cart")
            if (savedCart) {
              const parsed = JSON.parse(savedCart)
              const cartData = {
                items: parsed.items || [],
                total: parsed.total || 0,
                itemCount: parsed.itemCount || 0,
              }
              if (cartData.items.length > 0) {
                dispatch({ type: "LOAD_CART", payload: cartData })
              }
            }
          } catch (error) {
            console.error("Error loading cart from localStorage:", error)
          }
        }
      }
    }

    loadCart()
  }, [isAuthenticated, token])

  // Save cart to localStorage for non-authenticated users only
  useEffect(() => {
    if (!isAuthenticated && typeof window !== "undefined") {
      try {
        localStorage.setItem("gkicks-cart", JSON.stringify(state))
      } catch (error) {
        console.error("Error saving cart to localStorage:", error)
      }
    }
  }, [state, isAuthenticated])

  const addItem = async (item: Omit<CartItem, "quantity">, quantity: number = 1) => {
    if (isAuthenticated && token) {
      try {
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: item.id,
            size: item.size,
            color: item.color,
            quantity: quantity
          }),
        })
        
        if (response.ok) {
          const cartItems = await response.json()
          const total = cartItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
          const itemCount = cartItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)
          dispatch({ type: "LOAD_CART", payload: { items: cartItems, total, itemCount } })
        }
      } catch (error) {
        console.error("Error adding item to cart:", error)
      }
    } else {
      // For non-authenticated users, use local storage
      for (let i = 0; i < quantity; i++) {
        dispatch({ type: "ADD_ITEM", payload: item })
      }
    }
  }

  const removeItem = async (id: string, size: string) => {
    if (isAuthenticated && token) {
      try {
        const response = await fetch(`/api/cart?productId=${id}&size=${size}&color=${state.items.find(item => item.id === id && item.size === size)?.color || ''}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const result = await response.json()
          const total = result.items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
          const itemCount = result.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)
          dispatch({ type: "LOAD_CART", payload: { items: result.items, total, itemCount } })
        }
      } catch (error) {
        console.error("Error removing item from cart:", error)
      }
    } else {
      // For non-authenticated users, use local storage
      dispatch({ type: "REMOVE_ITEM", payload: { id, size } })
    }
  }

  const updateQuantity = async (id: string, size: string, quantity: number) => {
    if (isAuthenticated && token) {
      try {
        const response = await fetch('/api/cart', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: id,
            size: size,
            color: state.items.find(item => item.id === id && item.size === size)?.color || '',
            quantity: quantity
          }),
        })
        
        if (response.ok) {
          const cartItems = await response.json()
          const total = cartItems.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)
          const itemCount = cartItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)
          dispatch({ type: "LOAD_CART", payload: { items: cartItems, total, itemCount } })
        }
      } catch (error) {
        console.error("Error updating cart quantity:", error)
      }
    } else {
      // For non-authenticated users, use local storage
      dispatch({ type: "UPDATE_QUANTITY", payload: { id, size, quantity } })
    }
  }

  const clearCart = async () => {
    if (isAuthenticated && token) {
      try {
        const response = await fetch('/api/cart?clearAll=true', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          dispatch({ type: "CLEAR_CART" })
        }
      } catch (error) {
        console.error("Error clearing cart:", error)
      }
    } else {
      // For non-authenticated users, use local storage
      dispatch({ type: "CLEAR_CART" })
    }
  }

  return (
    <CartContext.Provider
      value={{
        state,
        dispatch,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
