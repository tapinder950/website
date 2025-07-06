"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  LogOut, 
  UserCircle2, 
  Bell, 
  Settings, 
  ChevronDown,
  Wifi,
  WifiOff
} from "lucide-react"
import { MemberBottomNav } from "@/components/member/bottom-nav"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [memberSince, setMemberSince] = useState<string>("")
  const [membershipStatus, setMembershipStatus] = useState<'active' | 'expired' | 'inactive'>('inactive')
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: user } = await supabase.auth.getUser()
        if (!user?.user?.id) {
          router.replace("/login")
          return
        }

        // Role check (profiles table)
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.user.id)
          .single()
        
        if (!profile || profile.role !== "member") {
          router.replace("/not-authorized")
          return
        }

        // Fetch member details
        const { data: member } = await supabase
          .from("members")
          .select("id, name, email, gym_id, created_at")
          .eq("user_id", user.user.id)
          .single()

        if (member) {
          setName(member.name || "")
          setEmail(member.email || user.user.email || "")
          setMemberSince(member.created_at || "")
          
          // Fetch subscription status from payments table
          const { data: paymentsData, error: paymentsError } = await supabase
            .from("payments")
            .select("*")
            .eq("gym_id", member.gym_id)
            .eq("payment_type", "subscription")
            .eq("payment_status", "completed")
            .filter("metadata->>member_id", "eq", member.id)
            .order("payment_date", { ascending: false })
            .limit(1)

          if (!paymentsError && paymentsData && paymentsData.length > 0) {
            const latestPayment = paymentsData[0]
            const endDate = latestPayment.metadata?.end_date ? new Date(latestPayment.metadata.end_date) : (() => {
              const startDate = latestPayment.metadata?.start_date ? new Date(latestPayment.metadata.start_date) : new Date(latestPayment.payment_date || new Date())
              const calculatedEndDate = new Date(startDate)
              const monthsAdded = latestPayment.metadata?.months_added || 1
              calculatedEndDate.setMonth(calculatedEndDate.getMonth() + monthsAdded)
              return calculatedEndDate
            })()
            
            const now = new Date()
            setMembershipStatus(endDate > now ? 'active' : 'expired')
          } else {
            // Fallback: Try subscription_payments method
            const { data: subscriptionsData } = await supabase
              .from("subscriptions")
              .select(`
                status,
                end_date,
                subscription_payments!inner (note)
              `)
              .eq("gym_id", member.gym_id)
              .order("created_at", { ascending: false })

            const memberSub = subscriptionsData?.find(sub => 
              sub.subscription_payments?.some(payment => 
                payment.note?.includes(`(ID: ${member.id})`) || 
                payment.note?.includes(member.name)
              )
            )

            if (memberSub?.status === 'active') {
              const daysLeft = Math.ceil((new Date(memberSub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              setMembershipStatus(daysLeft > 0 ? 'active' : 'expired')
            } else {
              setMembershipStatus('expired')
            }
          }
        }
      } catch (error) {
        console.error('Error fetching member data:', error)
        router.replace("/login")
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Online/offline detection
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [router])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = "/login"
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 pb-20">
        <div className="px-4 py-6">
          <Skeleton className="h-24 w-full rounded-2xl mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = () => {
    switch (membershipStatus) {
      case 'active': return 'bg-green-500'
      case 'expired': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (membershipStatus) {
      case 'active': return 'Active Member'
      case 'expired': return 'Membership Expired'
      default: return 'Inactive'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 pb-20">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-white/20 shadow-lg">
        <div className="px-4 py-4">
          {/* Network Status Indicator */}
          {!isOnline && (
            <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded-lg flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-red-600" />
              <span className="text-xs text-red-700">You're offline. Some features may not work.</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            {/* User Profile Section */}
            <div 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-white/50 rounded-xl p-1 sm:p-2 transition-all flex-1 min-w-0"
              onClick={() => setShowProfile(!showProfile)}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <UserCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white",
                  getStatusColor()
                )}></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 sm:gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                    {name || "Member"}
                  </h1>
                  <ChevronDown className={cn(
                    "w-3 h-3 sm:w-4 sm:h-4 text-gray-500 transition-transform flex-shrink-0",
                    showProfile && "rotate-180"
                  )} />
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs px-1 py-0.5 sm:px-2",
                      membershipStatus === 'active' ? 'border-green-200 bg-green-50 text-green-700' :
                      membershipStatus === 'expired' ? 'border-red-200 bg-red-50 text-red-700' :
                      'border-gray-200 bg-gray-50 text-gray-700'
                    )}
                  >
                    {getStatusText()}
                  </Badge>
                  {isOnline && (
                    <div className="hidden sm:flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">Online</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 sm:w-10 sm:h-10 p-0 hover:bg-white/50"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 sm:w-10 sm:h-10 p-0 hover:bg-white/50"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </Button>
              
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1 sm:gap-2 bg-white/50 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all px-2 sm:px-3"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs hidden sm:inline">Logout</span>
                <span className="text-xs sm:hidden">Out</span>
              </Button>
            </div>
          </div>

          {/* Expandable Profile Details */}
          {showProfile && (
            <Card className="mt-4 p-4 bg-white/70 backdrop-blur-sm border-white/50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-800">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-xs",
                      membershipStatus === 'active' ? 'border-green-200 bg-green-50 text-green-700' :
                      'border-red-200 bg-red-50 text-red-700'
                    )}
                  >
                    {getStatusText()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since:</span>
                  <span className="font-medium text-gray-800">
                    {memberSince ? format(new Date(memberSince), 'MMM yyyy') : 'Unknown'}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-2 sm:px-4 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Enhanced Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <MemberBottomNav />
      </div>
    </div>
  )
}