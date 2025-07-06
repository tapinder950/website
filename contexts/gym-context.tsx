"use client"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { 
  LogOut, 
  UserCircle2, 
  Bell, 
  Settings, 
  Menu,
  X
} from "lucide-react"
import { BottomNav } from "@/components/owner/bottom-nav"
import { GymContext } from "@/contexts/gym-context"

export default function OwnerLayout({
  children,
  pageTitle
}: {
  children: React.ReactNode,
  pageTitle?: string
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [gymId, setGymId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifications] = useState(3)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function fetchData() {
      try {
        setAuthError(null)
        
        // Get current user
        const { data: user, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error("Auth error:", userError)
          router.replace("/login")
          return
        }

        if (!user?.user?.id) {
          router.replace("/login")
          return
        }

        setEmail(user.user.email || "")

        // First, check if profiles table exists and get/create profile
        const profile = await getOrCreateProfile(user.user.id, user.user.email || "")
        
        if (!profile) {
          setAuthError("Unable to access profile")
          return
        }

        // Check if user is authorized
        if (!["gym_owner", "super_admin", "owner"].includes(profile.role)) {
          router.replace("/not-authorized")
          return
        }

        // Try to get name from gym_owners table first, then staff table, fallback to profile or email
        let displayName = profile.name || "Owner"
        
        try {
          const { data: gymOwner } = await supabase
            .from("gym_owners")
            .select("first_name, last_name, gym_id")
            .eq("user_id", user.user.id)
            .single()
          
          if (gymOwner?.first_name || gymOwner?.last_name) {
            displayName = `${gymOwner.first_name || ''} ${gymOwner.last_name || ''}`.trim()
          }
          
          if (gymOwner?.gym_id) {
            setGymId(gymOwner.gym_id)
          }
        } catch (gymOwnerError) {
          // Gym owner not found, try staff table
          try {
            const { data: staff } = await supabase
              .from("staff")
              .select("name")
              .eq("user_id", user.user.id)
              .single()
            
            if (staff?.name) {
              displayName = staff.name
            }
          } catch (staffError) {
            // Staff table might not exist or user not in staff table
            console.log("Staff lookup failed (this is normal for some setups):", staffError)
          }
        }

        setName(displayName)
      } catch (error) {
        console.error("Error in fetchData:", error)
        setAuthError("Authentication error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  // Function to get or create profile
  async function getOrCreateProfile(userId: string, email: string) {
    try {
      // First, try to get existing profile
      const { data: existingProfile, error: getError } = await supabase
        .from("profiles")
        .select("role, name, id")
        .eq("id", userId)
        .single()

      if (existingProfile && !getError) {
        return existingProfile
      }

      // If profile doesn't exist, create one
      console.log("Profile not found, creating new profile...")
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email: email,
          role: "gym_owner", // Default role
          name: email.split("@")[0], // Use email prefix as default name
          created_at: new Date().toISOString()
        })
        .select("role, name, id")
        .single()

      if (createError) {
        console.error("Error creating profile:", createError)
        
        // If profiles table doesn't exist, return a default profile
        if (createError.code === '42P01') { // Table doesn't exist
          console.log("Profiles table doesn't exist, using default authorization")
          return {
            id: userId,
            role: "gym_owner",
            name: email.split("@")[0]
          }
        }
        return null
      }

      return newProfile
    } catch (error) {
      console.error("Error in getOrCreateProfile:", error)
      // Return default profile if all else fails
      return {
        id: userId,
        role: "gym_owner",
        name: email.split("@")[0] || "Owner"
      }
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.replace("/login")
    } catch (error) {
      console.error("Error logging out:", error)
      window.location.href = "/login"
    }
  }

  const getPageTitle = () => {
    if (pageTitle) return pageTitle
    
    const pathSegments = pathname.split('/').filter(Boolean)
    const lastSegment = pathSegments[pathSegments.length - 1]
    
    switch (lastSegment) {
      case 'owner':
        return 'Dashboard'
      case 'members':
        return 'Members'
      case 'subscriptions':
        return 'Subscriptions'
      case 'staff':
        return 'Staff Management'
      case 'checkins':
        return 'Check-ins'
      case 'qr':
        return 'QR Codes'
      case 'analytics':
        return 'Analytics'
      default:
        return 'Dashboard'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg">
          <div className="text-red-600 mb-4">
            <UserCircle2 className="w-16 h-16 mx-auto mb-2" />
            <h2 className="text-xl font-semibold">Authentication Error</h2>
            <p className="text-sm mt-2">{authError}</p>
          </div>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Login Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <GymContext.Provider value={{ gymId }}>
      <div className="min-h-screen bg-gray-50 pb-20 lg:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              {/* Left side */}
              <div className="flex items-center gap-4">
                {/* Mobile menu trigger */}
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Logo and title */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">GM</span>
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
                    <p className="text-xs text-gray-500">Gym Management System</p>
                  </div>
                </div>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-3">
                {/* Notifications */}
                <button className="relative p-2 rounded-md hover:bg-gray-100">
                  <Bell className="h-5 w-5" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {notifications}
                    </span>
                  )}
                </button>

                {/* Settings */}
                <button className="p-2 rounded-md hover:bg-gray-100">
                  <Settings className="h-5 w-5" />
                </button>

                {/* User info */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">
                      {name.split(' ').map(n => n[0]).join('').toUpperCase() || 'O'}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">Owner</p>
                  </div>
                </div>

                {/* Logout */}
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Log out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}>
            <div 
              className="fixed left-0 top-0 h-full w-80 max-w-[80vw] bg-white shadow-lg transform transition-transform"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="p-4">
                <MobileMenu onClose={() => setMobileMenuOpen(false)} />
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          {children}
        </main>

        {/* Bottom navigation for mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <BottomNav />
        </div>
      </div>
    </GymContext.Provider>
  )
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const menuItems = [
    { name: "Dashboard", href: "/dashboards/owner" },
    { name: "Members", href: "/dashboards/owner/management?tab=members" },
    { name: "Subscriptions", href: "/dashboards/owner/subscriptions" },
    { name: "Staff", href: "/dashboards/owner/management?tab=staff" },
    { name: "Check-ins", href: "/dashboards/owner/checkins" },
    { name: "QR Codes", href: "/dashboards/owner/qr" },
    { name: "Settings", href: "/dashboards/owner/settings" },
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = "/login"
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {menuItems.map((item) => (
          <li key={item.name}>
            <a
              href={item.href}
              className="block px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={onClose}
            >
              {item.name}
            </a>
          </li>
        ))}
      </ul>
      
      <div className="border-t pt-4">
        <button
          onClick={() => {
            handleLogout()
            onClose()
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
