"use client"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Users, 
  CreditCard, 
  UserCog, 
  QrCode, 
  ActivitySquare, 
  TrendingUp,
  Clock,
  DollarSign
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useGym } from "./layout"

interface Stats {
  memberCount: number
  activeSubs: number
  staffCount: number
  checkinsToday: number
  revenue: number
  expiringToday: number
}

export default function OwnerDashboard() {
  const { gymId } = useGym()
  const [stats, setStats] = useState<Stats>({
    memberCount: 0,
    activeSubs: 0,
    staffCount: 0,
    checkinsToday: 0,
    revenue: 0,
    expiringToday: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError(null)
        
        if (!gymId) {
          setLoading(false)
          return
        }
        
        const today = new Date().toISOString().split("T")[0]
        
        // Fetch counts in parallel with proper error handling - all filtered by gym_id
        const [
          membersResult,
          staffResult,
          activeSubsResult,
          checkinsResult,
          expiringResult
        ] = await Promise.allSettled([
          supabase.from("members").select("*", { count: "exact", head: true }).eq("gym_id", gymId),
          supabase.from("staff").select("*", { count: "exact", head: true }).eq("gym_id", gymId),
          supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("gym_id", gymId).eq("status", "active"),
          supabase.from("checkins").select("member_id, members!inner(gym_id)", { count: "exact", head: true }).eq("members.gym_id", gymId).gte("created_at", `${today}T00:00:00`),
          supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("gym_id", gymId).eq("end_date", today)
        ])

        // Calculate revenue from active subscriptions - filtered by gym_id
        const { data: revenueData, error: revenueError } = await supabase
          .from("subscriptions")
          .select("plan_price")
          .eq("gym_id", gymId)
          .eq("status", "active")

        let totalRevenue = 0
        if (!revenueError && revenueData) {
          totalRevenue = revenueData.reduce((sum, sub) => sum + (sub.plan_price || 0), 0)
        }

        setStats({
          memberCount: membersResult.status === 'fulfilled' ? (membersResult.value.count || 0) : 0,
          staffCount: staffResult.status === 'fulfilled' ? (staffResult.value.count || 0) : 0,
          activeSubs: activeSubsResult.status === 'fulfilled' ? (activeSubsResult.value.count || 0) : 0,
          checkinsToday: checkinsResult.status === 'fulfilled' ? (checkinsResult.value.count || 0) : 0,
          revenue: totalRevenue,
          expiringToday: expiringResult.status === 'fulfilled' ? (expiringResult.value.count || 0) : 0
        })

      } catch (error) {
        console.error("Error fetching stats:", error)
        setError("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [gymId])

  const quickStats = [
    {
      title: "Total Members",
      value: stats.memberCount,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: "+12%",
      changeType: "positive" as const
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubs,
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: "+8%",
      changeType: "positive" as const
    },
    {
      title: "Today's Check-ins",
      value: stats.checkinsToday,
      icon: ActivitySquare,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      change: "+23%",
      changeType: "positive" as const
    },
    {
      title: "Monthly Revenue",
      value: `$${stats.revenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      change: "+15%",
      changeType: "positive" as const
    }
  ]

  const quickActions = [
    {
      title: "Manage Members",
      description: "Add, edit, or view member profiles",
      href: "/dashboards/owner/management?tab=members",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Subscriptions",
      description: "Handle member subscriptions",
      href: "/dashboards/owner/subscriptions",
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Staff Management",
      description: "Manage your gym staff",
      href: "/dashboards/owner/management?tab=staff",
      icon: UserCog,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "QR Check-in",
      description: "Generate QR codes for check-ins",
      href: "/dashboards/owner/qr",
      icon: QrCode,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Check-in History",
      description: "View member check-in records",
      href: "/dashboards/owner/checkins",
      icon: ActivitySquare,
      color: "text-pink-600",
      bgColor: "bg-pink-50"
    }
  ]

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-blue-100">Welcome back! Here's what's happening at your gym today.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Alerts Section */}
      {stats.expiringToday > 0 && (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-800">Attention Required</h3>
                <p className="text-sm text-amber-700">
                  {stats.expiringToday} subscription(s) expiring today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <ActionCard key={index} {...action} />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, bgColor, change, changeType }: {
  title: string
  value: string | number
  icon: any
  color: string
  bgColor: string
  change: string
  changeType: 'positive' | 'negative'
}) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bgColor}`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-600">{change}</span>
          <span className="text-sm text-gray-500">vs last month</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ActionCard({ title, description, href, icon: Icon, color, bgColor }: {
  title: string
  description: string
  href: string
  icon: any
  color: string
  bgColor: string
}) {
  return (
    <Link href={href} className="block group">
      <Card className="h-full hover:shadow-lg transition-all duration-200 border-0 shadow-sm group-hover:scale-105">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${bgColor} group-hover:scale-110 transition-transform`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {title}
              </h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-32 w-full rounded-2xl bg-gray-200 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 w-full bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 w-full bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}