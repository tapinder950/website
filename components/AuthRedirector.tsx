"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"

const DASHBOARD_ROUTES: Record<string, string> = {
  super_admin: "/dashboards/super_admin",
  gym_owner: "/dashboards/owner",
  staff: "/dashboards/staff",
  member: "/dashboards/member",
  trainer: "/dashboards/trainer",
}

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"]

interface AuthContextType {
  user: User | null
  userRole: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true
})

export const useAuth = () => useContext(AuthContext)

export default function AuthRedirector({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    let ignore = false

    const checkAuth = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (!ignore) {
          setUser(currentUser)
        }

        if (!currentUser) {
          // Not logged in: redirect to login unless already on public route
          if (!PUBLIC_ROUTES.includes(pathname)) {
            setRedirecting(true)
            router.replace("/login")
            return
          }
          setLoading(false)
          return
        }

        // Fetch user role
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .single()

        if (error || !profile) {
          console.error("Profile fetch error:", error)
          // Something wrong, force logout
          await supabase.auth.signOut()
          setRedirecting(true)
          router.replace("/login")
          return
        }

        if (!ignore) {
          setUserRole(profile.role)
        }

        // If user is on a public route but logged in, redirect to dashboard
        if (PUBLIC_ROUTES.includes(pathname)) {
          const expectedRoute = DASHBOARD_ROUTES[profile.role]
          if (expectedRoute) {
            setRedirecting(true)
            router.replace(expectedRoute)
            return
          }
        }

        // Check if user is on the correct dashboard
        const expectedRoute = DASHBOARD_ROUTES[profile.role]
        if (expectedRoute && !pathname.startsWith(expectedRoute)) {
          setRedirecting(true)
          router.replace(expectedRoute)
          return
        }

        setLoading(false)
      } catch (error) {
        console.error("Auth check error:", error)
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setUserRole(null)
          if (!PUBLIC_ROUTES.includes(pathname)) {
            setRedirecting(true)
            router.replace("/login")
          }
        } else if (event === 'SIGNED_IN' && session) {
          checkAuth()
        }
      }
    )

    return () => {
      ignore = true
      subscription.unsubscribe()
    }
  }, [router, pathname])

  const LoadingScreen = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100"
    >
      <div className="flex flex-col items-center space-y-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {redirecting ? "Redirecting..." : "Loading..."}
          </h3>
          <p className="text-gray-600">
            {redirecting ? "Taking you to the right place" : "Please wait while we verify your session"}
          </p>
        </motion.div>
      </div>
    </motion.div>
  )

  if (loading || redirecting) {
    return <LoadingScreen />
  }

  return (
    <AuthContext.Provider value={{ user, userRole, loading }}>
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </AuthContext.Provider>
  )
}