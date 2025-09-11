import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { User } from "@/contexts/auth-context"
import { executeQuery } from "@/lib/database/mysql"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      if (session.user) {
        // Map NextAuth session to our User interface
        let role: 'admin' | 'staff' | 'customer' = 'customer' // Default role for all users
        let userId = ''
        
        // Get user from database to get proper ID and role
        try {
          const dbUser = await executeQuery(
            'SELECT id, is_admin FROM users WHERE email = ?',
            [session.user.email || null]
          )
          
          if (dbUser && Array.isArray(dbUser) && dbUser.length > 0) {
            userId = (dbUser as any[])[0].id.toString()
            role = (dbUser as any[])[0].is_admin ? 'admin' : 'customer'
          }
          
          // Check admin_users table for staff/admin roles
          const adminUser = await executeQuery(
            'SELECT role FROM admin_users WHERE email = ? AND is_active = 1',
            [session.user.email || null]
          )
          
          if (adminUser && Array.isArray(adminUser) && adminUser.length > 0) {
            role = (adminUser as any[])[0].role as 'admin' | 'staff'
          } else if (session.user.email === 'gkcksdmn@gmail.com') {
            // Fallback for legacy admin
            role = 'admin'
          }
        } catch (error) {
          console.error('Error checking database for user:', error)
          // Fallback to legacy admin check
          if (session.user.email === 'gkcksdmn@gmail.com') {
            role = 'admin'
          }
        }
        
        const user: User = {
          id: userId || token.sub || '',
          email: session.user.email || '',
          firstName: session.user.name?.split(' ')[0] || '',
          lastName: session.user.name?.split(' ').slice(1).join(' ') || '',
          role: role,
          avatar: session.user.image || '',
        }
        
        console.log('🔍 Auth: User session created -', user.email, 'role:', user.role, 'id:', user.id)
        
        // Store user in database if needed
        await storeUserInDatabase(user)
        
        // Override session.user with our User type
        ;(session as any).user = user
      }
      return session
    },
  },
  pages: {
    signIn: '/auth',
  },
  session: {
    strategy: 'jwt',
  },
}

// Function to store user in database
async function storeUserInDatabase(user: User) {
  try {
    // First check if user exists in admin_users table (staff/admin users)
    const existingAdminUsers = await executeQuery(
      'SELECT id, role FROM admin_users WHERE email = ?',
      [user.email]
    ) as any[]
    
    if (existingAdminUsers.length > 0) {
      // User exists in admin_users table - do NOT create in users table
      console.log('✅ Auth: Admin/Staff user found in admin_users table:', user.email, 'role:', existingAdminUsers[0].role)
      return
    }
    
    // Check if user already exists in users table
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [user.email]
    ) as any[]
    
    if (existingUsers.length === 0) {
      // Insert new user (only for regular customers, not staff/admin)
      await executeQuery(
        'INSERT INTO users (email, first_name, last_name, avatar_url, is_admin) VALUES (?, ?, ?, ?, ?)',
        [
          user.email,
          user.firstName || '',
          user.lastName || '',
          user.avatar || '',
          user.role === 'admin' ? 1 : 0
        ]
      )
      console.log('✅ Auth: New customer user stored in database:', user.email)
    } else {
      // Update existing user (including admin status)
      await executeQuery(
        'UPDATE users SET first_name = ?, last_name = ?, avatar_url = ?, is_admin = ? WHERE email = ?',
        [user.firstName || '', user.lastName || '', user.avatar || '', user.role === 'admin' ? 1 : 0, user.email || '']
      )
      console.log('✅ Auth: User updated in database:', user.email)
    }
  } catch (error) {
    console.error('❌ Auth: Error storing user in database:', error)
  }
}