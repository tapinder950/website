"use client"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Users, CheckSquare, Clock, UserPlus, ListChecks } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useStaffGym } from "./layout"

export default function StaffDashboard() {
  const { gymId } = useStaffGym()
  const [memberCount, setMemberCount] = useState(0)
  const [checkinsToday, setCheckinsToday] = useState(0)
  const [expiring, setExpiring] = useState(0)

  useEffect(() => {
    const fetchStats = async () => {
      if (!gymId) return

      // All members from this gym only
      const { count: mCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gymId)
      setMemberCount(mCount || 0)

      // Today's check-ins from this gym's members only
      const today = new Date().toISOString().split("T")[0]
      const { count: ciCount } = await supabase
        .from("checkins")
        .select("member_id, members!inner(gym_id)", { count: "exact", head: true })
        .eq("members.gym_id", gymId)
        .gte("check_in", `${today}T00:00:00`)
      setCheckinsToday(ciCount || 0)

      // Subscriptions expiring in next 7 days from this gym only
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      const nextWeekISO = nextWeek.toISOString().split("T")[0]
      const { count: expCount } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .lt("end_date", nextWeekISO)
        .gte("end_date", today)
        .eq("status", "active")
      setExpiring(expCount || 0)
    }
    fetchStats()
  }, [gymId])

  // Shortcuts
  const shortcuts = [
    {
      name: "Manual Check-in/out",
      href: "/dashboards/staff/manual-checkin",
      icon: CheckSquare,
      color: "bg-blue-100 text-blue-700",
    },
    {
      name: "Member List",
      href: "/dashboards/staff/members",
      icon: Users,
      color: "bg-green-100 text-green-700",
    },
    {
      name: "Today's Check-ins",
      href: "/dashboards/staff/checkins",
      icon: ListChecks,
      color: "bg-orange-100 text-orange-700",
    },
    {
      name: "Expiring Subs",
      href: "/dashboards/staff/expiring-subs",
      icon: Clock,
      color: "bg-pink-100 text-pink-700",
    },
    {
      name: "Add New Member",
      href: "/dashboards/staff/add-member",
      icon: UserPlus,
      color: "bg-purple-100 text-purple-700",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Members" value={memberCount} icon={Users} />
        <StatCard label="Today Check-ins" value={checkinsToday} icon={CheckSquare} />
        <StatCard label="Expiring in 7d" value={expiring} icon={Clock} />
      </div>
      {/* Shortcuts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {shortcuts.map(sc => (
          <Link key={sc.name} href={sc.href} className="no-underline">
            <Card className="transition-transform hover:scale-105 group shadow-md cursor-pointer">
              <CardContent className="flex flex-col items-center py-6 gap-2">
                <div className={`rounded-full p-3 ${sc.color}`}>
                  <sc.icon className="w-8 h-8" />
                </div>
                <span className="font-semibold text-sm group-hover:underline">{sc.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-3 py-4">
        <Icon className="w-8 h-8 text-gray-400" />
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}
