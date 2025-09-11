"use client";

import React, { createContext, useContext, useReducer, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "customer" | "admin" | "staff";
  avatar?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  tokenReady: boolean;
}

type AuthAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_TOKEN_READY"; payload: boolean };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  tokenReady: boolean;
  login: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updateUserData: (updates: Partial<User>) => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_TOKEN_READY":
      return { ...state, tokenReady: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    loading: true,
    tokenReady: false,
  });
  const { toast } = useToast();

  // Fetch complete user profile data
  const fetchUserProfile = async (token: string, abortController?: AbortController) => {
    try {
      const response = await fetch('/api/profiles', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: abortController?.signal,
      });

      if (response.ok) {
        const profileData = await response.json();
        if (profileData && state.user) {
          // Update user with complete profile data, prioritizing saved profile data over Gmail data
          const updatedUser: User = {
            ...state.user,
            firstName: profileData.first_name || state.user.firstName,
            lastName: profileData.last_name || state.user.lastName,
            avatar: profileData.avatar_url || state.user.avatar,
          };
          
          // If we have saved profile data, use it instead of Gmail fallbacks
          if (profileData.first_name && profileData.first_name.trim()) {
            updatedUser.firstName = profileData.first_name.trim();
          }
          if (profileData.last_name && profileData.last_name.trim()) {
            updatedUser.lastName = profileData.last_name.trim();
          }
          if (profileData.avatar_url && profileData.avatar_url.trim()) {
            updatedUser.avatar = profileData.avatar_url.trim();
          }
          
          dispatch({ type: "SET_USER", payload: updatedUser });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to fetch user profile:', error);
      }
    }
  };

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if we need to fetch profile on app initialization (when token exists but profile wasn't fetched)
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();
    
    const fetchProfileOnAppInit = async () => {
      if (state.tokenReady && state.user && typeof window !== "undefined" && isMounted) {
        const token = localStorage.getItem('auth_token');
        // Always fetch profile data to ensure we have the latest saved profile information
        // This is important for users who log in with Google but have saved custom profile data
        if (token && isMounted) {
          console.log('🔄 App initialization: fetching user profile for existing token');
          try {
            await fetchUserProfile(token, abortController);
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.log('⚠️ Profile fetch failed during app init:', error);
            }
          }
        }
      }
    };

    fetchProfileOnAppInit();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [state.tokenReady, state.user?.id]); // Use user.id instead of entire user object to prevent unnecessary re-runs



  // Check if user is authenticated
  const checkAuthStatus = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        dispatch({ type: "SET_USER", payload: null });
        dispatch({ type: "SET_TOKEN_READY", payload: false });
        dispatch({ type: "SET_LOADING", payload: false });
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        // Use the role field from the API response (which now includes staff detection)
        const user = {
          ...userData.user,
          role: userData.user.role || (userData.user.is_admin ? 'admin' : 'customer')
        };
        console.log('🔍 Auth Context: User role detected:', user.role, 'for email:', user.email);
        dispatch({ type: "SET_USER", payload: user });
        dispatch({ type: "SET_TOKEN_READY", payload: true });
        
        // Fetch complete user profile data
        await fetchUserProfile(token);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token');
        dispatch({ type: "SET_USER", payload: null });
        dispatch({ type: "SET_TOKEN_READY", payload: false });
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      localStorage.removeItem('auth_token');
      dispatch({ type: "SET_USER", payload: null });
      dispatch({ type: "SET_TOKEN_READY", payload: false });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };





  const login = async (provider: string) => {
    // This method is primarily used by admin context
    // For regular users, authentication is handled via OAuth flows
    console.log(`Login with ${provider} - handled by OAuth flow`);
  };

  const logout = async () => {
    await signOut();
  };

  const signOut = async () => {
    try {
      // Clear JWT token from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem('auth_token');
      }
      
      // Call logout API endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      dispatch({ type: "SET_USER", payload: null });
      dispatch({ type: "SET_TOKEN_READY", payload: false });
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      
      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Sign out failed",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!state.user) throw new Error("No user logged in");
      
      const token = localStorage.getItem('auth_token');
      
      // First, fetch current profile data to preserve all fields
      const getCurrentProfile = async () => {
        const response = await fetch(`/api/profiles?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
        return null;
      };
      
      const currentProfile = await getCurrentProfile();
      console.log('🔍 Current profile data for update:', currentProfile);
      
      // Prepare update payload with all current data plus updates
      const updatePayload = {
        first_name: updates.firstName || currentProfile?.first_name || '',
        last_name: updates.lastName || currentProfile?.last_name || '',
        phone: currentProfile?.phone || '',
        birthdate: currentProfile?.birthdate || '',
        gender: currentProfile?.gender || '',
        bio: currentProfile?.bio || '',
        avatar_url: updates.avatar || currentProfile?.avatar_url || '',
        preferences: currentProfile?.preferences || {
          newsletter: true,
          sms_notifications: false,
          email_notifications: true,
          preferred_language: 'en',
          currency: 'PHP'
        }
      };
      
      console.log('📝 Sending profile update with payload:', updatePayload);
      
      const response = await fetch('/api/profiles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(updatePayload),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Failed to parse profile update response:', jsonError);
        throw new Error('Invalid response from server');
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Profile update failed');
      }
      
      // Update user profile locally with server response
      const updatedUser = { ...state.user, ...updates };
      dispatch({ type: "SET_USER", payload: updatedUser });
      
      // Refresh user profile from database to ensure consistency
      if (token) {
        await fetchUserProfile(token);
      }
      
      console.log('✅ Profile updated successfully in auth context');
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Update profile error:", error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateUserData = (updates: Partial<User>) => {
    if (!state.user) return;
    
    const updatedUser = { ...state.user, ...updates };
    dispatch({ type: "SET_USER", payload: updatedUser });
    console.log('✅ User data updated in auth context:', updatedUser);
  };

  // Initialize and check for existing authentication on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      // Only run if we don't have a user yet but have a stored token
      const storedToken = localStorage.getItem('auth_token')
      
      if (storedToken && !state.user) {
        dispatch({ type: "SET_TOKEN_READY", payload: true })
        await fetchUserProfile(storedToken)
      } else if (!storedToken) {
        dispatch({ type: "SET_TOKEN_READY", payload: false })
      }
    }
    
    initializeAuth()
  }, []) // Run only once on mount

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        loading: state.loading,
        tokenReady: state.tokenReady,
        login,
        logout,
        signOut,
        updateProfile,
        updateUserData,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  // Check if we're on the server side first
  if (typeof window === 'undefined') {
    return {
      user: null,
      loading: true,
      tokenReady: false,
      login: async () => {},
      logout: async () => {},
      signOut: async () => {},
      updateProfile: async () => {},
      updateUserData: () => {},
      checkAuthStatus: async () => {}
    };
  }
  
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    // Return safe defaults during SSR instead of throwing
    return {
      user: null,
      loading: true,
      tokenReady: false,
      login: async () => {},
      logout: async () => {},
      signOut: async () => {},
      updateProfile: async () => {},
      updateUserData: () => {},
      checkAuthStatus: async () => {}
    };
  }
  return context;
}
