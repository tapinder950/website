"use client"
import { useEffect, useState, createContext, useContext } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { LogOut, UserCircle2 } from "lucide-react"
import { StaffBottomNav } from "@/components/staff/bottom-nav"

interface StaffGymContextType {
  gymId: string | null
  staffId: string | null
}

const StaffGymContext = createContext<StaffGymContextType>({
  gymId: null,
  staffId: null
})

export const useStaffGym = () => useContext(StaffGymContext)

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [gymId, setGymId] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setAuthError(null)
        
        const { data: user, error: userError } = await supabase.auth.getUser()
        if (userError || !user?.user?.id) {
          router.replace("/login")
          return
        }

        // Check if user is authorized as staff and get gym_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.user.id)
          .single()

        if (!profile || !["staff", "super_admin"].includes(profile.role)) {
          router.replace("/not-authorized")
          return
        }

        // Fetch staff info including gym_id (user_id links to auth.users)
        const { data: staffData, error: staffError } = await supabase
          .from("staff")
          .select("name, gym_id, id")
          .eq("user_id", user.user.id)
          .single()

        if (staffError || !staffData) {
          console.error("Staff data fetch error:", staffError)
          setAuthError("Staff information not found. Please contact your administrator.")
          setLoading(false)
          return
        }

        setName(staffData.name || "Staff")
        setGymId(staffData.gym_id)
        setStaffId(staffData.id)
        setLoading(false)
      } catch (error) {
        console.error("Error in fetchStaff:", error)
        setAuthError("Authentication error occurred")
        setLoading(false)
      }
    }
    fetchStaff()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff dashboard...</p>
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
    <StaffGymContext.Provider value={{ gymId, staffId }}>
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="w-full flex items-center justify-between bg-white shadow px-2 sm:px-4 py-3 sm:py-4 rounded-xl mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <UserCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-orange-300 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-bold text-gray-800 truncate">
                Welcome, {name ? name : "Staff"}!
              </div>
              <div className="text-xs sm:text-sm text-gray-500">Staff Dashboard</div>
            </div>
          </div>
          <Button onClick={handleLogout} variant="destructive" size="sm" className="flex items-center gap-1 flex-shrink-0">
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Log out</span>
            <span className="sm:hidden text-xs">Out</span>
          </Button>
        </header>
        <main className="px-2 sm:px-4 md:px-6 py-4">{children}</main>
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <StaffBottomNav />
        </div>
      </div>
    </StaffGymContext.Provider>
  )
}
