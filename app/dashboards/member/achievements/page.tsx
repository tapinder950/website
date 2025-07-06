"use client"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Award, Trophy, Star, Flame, Sun, Calendar, Clock, Target, RefreshCw, User, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, differenceInDays, startOfDay } from "date-fns"

const BADGES = [
  { id: 1, label: "First Steps", icon: Award, checkins: 1, color: "bg-green-50", desc: "Your first check-in!" },
  { id: 2, label: "Getting Started", icon: Calendar, checkins: 5, color: "bg-blue-50", desc: "5 check-ins completed" },
  { id: 3, label: "Regular", icon: Star, checkins: 20, color: "bg-purple-50", desc: "20 check-ins completed" },
  { id: 4, label: "Dedicated", icon: Target, checkins: 50, color: "bg-orange-50", desc: "50 check-ins completed" },
  { id: 5, label: "Champion", icon: Trophy, checkins: 100, color: "bg-yellow-50", desc: "100 check-ins completed" },
]

interface MemberStats {
  totalCheckins: number
  totalMinutes: number
  currentStreak: number
  longestStreak: number
  earlyBirdCount: number
  thisMonthCheckins: number
  averageSessionTime: number
}

interface LeaderboardEntry {
  member_id: string
  name: string
  checkins: number
  total_minutes: number
}

export default function MemberAchievementsPage() {
  const [member, setMember] = useState<any>(null)
  const [stats, setStats] = useState<MemberStats>({
    totalCheckins: 0,
    totalMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    earlyBirdCount: 0,
    thisMonthCheckins: 0,
    averageSessionTime: 0
  })
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [badges, setBadges] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        setLoading(false)
        return
      }

      // Get member information
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, name, gym_id, created_at")
        .eq("user_id", user.id)
        .single()

      if (memberError || !memberData) {
        console.error('Error fetching member:', memberError)
        setLoading(false)
        return
      }

      setMember(memberData)

      // Get all check-ins for this member
      const { data: checkins, error: checkinsError } = await supabase
        .from("checkins")
        .select("*")
        .eq("member_id", memberData.id)
        .order("check_in", { ascending: false })

      if (checkinsError) {
        console.error('Error fetching check-ins:', checkinsError)
        setLoading(false)
        return
      }

      // Calculate member statistics
      const memberStats = calculateMemberStats(checkins || [])
      setStats(memberStats)

      // Get leaderboard data (direct calculation since view might not exist)
      await fetchLeaderboard(memberData.gym_id, memberData.id)

    } catch (error) {
      console.error('Error fetching achievements data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLeaderboard = async (gymId: string, memberId: string) => {
    try {
      // Get all members from the same gym
      const { data: gymMembers, error: membersError } = await supabase
        .from("members")
        .select("id, name")
        .eq("gym_id", gymId)

      if (membersError) {
        console.error('Error fetching gym members:', membersError)
        return
      }

      // Calculate stats for each member
      const leaderboardData: LeaderboardEntry[] = []
      
      for (const gymMember of gymMembers || []) {
        const { data: memberCheckins } = await supabase
          .from("checkins")
          .select("check_in, check_out")
          .eq("member_id", gymMember.id)

        const totalCheckins = memberCheckins?.length || 0
        const totalMinutes = memberCheckins?.reduce((total, checkin) => {
          if (checkin.check_out) {
            const duration = new Date(checkin.check_out).getTime() - new Date(checkin.check_in).getTime()
            return total + (duration / (1000 * 60)) // Convert to minutes
          }
          return total
        }, 0) || 0

        leaderboardData.push({
          member_id: gymMember.id,
          name: gymMember.name,
          checkins: totalCheckins,
          total_minutes: Math.round(totalMinutes)
        })
      }

      // Sort by check-ins, then by total minutes
      leaderboardData.sort((a, b) => {
        if (b.checkins !== a.checkins) return b.checkins - a.checkins
        return b.total_minutes - a.total_minutes
      })

      setLeaderboard(leaderboardData.slice(0, 10))
      
      // Find current member's rank
      const memberIndex = leaderboardData.findIndex(m => m.member_id === memberId)
      setMyRank(memberIndex >= 0 ? memberIndex + 1 : null)

    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }

  const calculateMemberStats = (checkins: any[]): MemberStats => {
    if (!checkins || checkins.length === 0) {
      return {
        totalCheckins: 0,
        totalMinutes: 0,
        currentStreak: 0,
        longestStreak: 0,
        earlyBirdCount: 0,
        thisMonthCheckins: 0,
        averageSessionTime: 0
      }
    }

    const totalCheckins = checkins.length
    
    // Calculate total minutes
    const totalMinutes = checkins.reduce((total, checkin) => {
      if (checkin.check_out) {
        const duration = new Date(checkin.check_out).getTime() - new Date(checkin.check_in).getTime()
        return total + (duration / (1000 * 60)) // Convert to minutes
      }
      return total
    }, 0)

    // Calculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(checkins)

    // Calculate early bird count (before 8 AM)
    const earlyBirdCount = checkins.filter(checkin => {
      const checkInTime = new Date(checkin.check_in)
      return checkInTime.getHours() < 8
    }).length

    // Calculate this month's check-ins
    const thisMonth = new Date()
    const thisMonthCheckins = checkins.filter(checkin => {
      const checkInDate = new Date(checkin.check_in)
      return checkInDate.getMonth() === thisMonth.getMonth() && 
             checkInDate.getFullYear() === thisMonth.getFullYear()
    }).length

    // Calculate average session time
    const completedSessions = checkins.filter(c => c.check_out)
    const averageSessionTime = completedSessions.length > 0 
      ? totalMinutes / completedSessions.length 
      : 0

    return {
      totalCheckins,
      totalMinutes: Math.round(totalMinutes),
      currentStreak,
      longestStreak,
      earlyBirdCount,
      thisMonthCheckins,
      averageSessionTime: Math.round(averageSessionTime)
    }
  }

  const calculateStreaks = (checkins: any[]) => {
    if (checkins.length === 0) return { currentStreak: 0, longestStreak: 0 }

    // Get unique days
    const uniqueDays = [...new Set(checkins.map(c => 
      startOfDay(new Date(c.check_in)).getTime()
    ))].sort((a, b) => b - a) // Most recent first

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 1

    if (uniqueDays.length === 0) return { currentStreak: 0, longestStreak: 0 }

    // Calculate current streak
    const today = startOfDay(new Date()).getTime()
    const yesterday = today - (24 * 60 * 60 * 1000)
    
    if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
      currentStreak = 1
      for (let i = 1; i < uniqueDays.length; i++) {
        const dayDiff = (uniqueDays[i-1] - uniqueDays[i]) / (24 * 60 * 60 * 1000)
        if (dayDiff === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < uniqueDays.length; i++) {
      const dayDiff = (uniqueDays[i-1] - uniqueDays[i]) / (24 * 60 * 60 * 1000)
      if (dayDiff === 1) {
        tempStreak++
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak)

    return { currentStreak, longestStreak }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Update badges when stats change
  useEffect(() => {
    const dynamicBadges = [
      {
        id: 6, 
        label: "Streak Master", 
        icon: Flame, 
        unlocked: stats.currentStreak >= 7, 
        color: "bg-red-50",
        desc: "7+ day streak"
      },
      {
        id: 7, 
        label: "Early Bird", 
        icon: Sun, 
        unlocked: stats.earlyBirdCount >= 10, 
        color: "bg-orange-50",
        desc: "10+ early check-ins"
      },
      {
        id: 8, 
        label: "Time Master", 
        icon: Clock, 
        unlocked: stats.totalMinutes >= 600, 
        color: "bg-purple-50",
        desc: "10+ hours total"
      },
      {
        id: 9, 
        label: "Monthly Hero", 
        icon: Calendar, 
        unlocked: stats.thisMonthCheckins >= 15, 
        color: "bg-indigo-50",
        desc: "15+ check-ins this month"
      }
    ]

    const allBadges = [
      ...BADGES.map(b => ({
        ...b,
        unlocked: stats.totalCheckins >= b.checkins,
      })),
      ...dynamicBadges
    ]

    setBadges(allBadges)
  }, [stats])

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}m`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
          <p className="text-gray-600 mt-1">Track your progress and compete with others</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Check-ins</p>
                <p className="text-2xl font-bold">{stats.totalCheckins}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Current Streak</p>
                <p className="text-2xl font-bold">{stats.currentStreak}</p>
                <p className="text-green-100 text-xs">days</p>
              </div>
              <Flame className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Time</p>
                <p className="text-2xl font-bold">{formatTime(stats.totalMinutes)}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Leaderboard</p>
                <p className="text-2xl font-bold">#{myRank || '--'}</p>
                <p className="text-orange-100 text-xs">position</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges/Achievements */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            Your Badges
            <Badge variant="outline" className="ml-2">
              {badges.filter(b => b.unlocked).length} / {badges.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map(badge => {
              const Icon = badge.icon
              return (
                <div
                  key={badge.id}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl p-4 shadow-sm border transition-all",
                    badge.unlocked
                      ? `${badge.color} border-green-200 text-green-800`
                      : "bg-gray-50 border-gray-200 text-gray-400 opacity-60"
                  )}
                >
                  <Icon className={cn(
                    "w-8 h-8 mb-2",
                    badge.unlocked ? "text-green-600" : "text-gray-300"
                  )} />
                  <span className="font-semibold text-sm text-center">{badge.label}</span>
                  <span className="text-xs text-center text-gray-500 mt-1">{badge.desc}</span>
                  {badge.unlocked && (
                    <Badge className="mt-2 bg-green-100 text-green-700 text-xs">
                      Unlocked
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Gym Leaderboard
            {myRank && myRank <= 10 && (
              <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
                You're in top 10!
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">#</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Check-ins</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr
                      key={entry.member_id}
                      className={cn(
                        "border-b border-gray-100",
                        member?.id === entry.member_id ? "bg-green-50 font-semibold" : ""
                      )}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {index + 1}
                          {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                          {index === 1 && <Trophy className="w-4 h-4 text-gray-400" />}
                          {index === 2 && <Trophy className="w-4 h-4 text-orange-500" />}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {entry.name}
                          {member?.id === entry.member_id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">{entry.checkins}</td>
                      <td className="py-3 px-2">{formatTime(entry.total_minutes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {myRank && myRank > 10 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-sm text-blue-700 font-medium">
                    Your current rank: #{myRank}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Keep checking in to climb the leaderboard!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No leaderboard data available</p>
              <p className="text-sm text-gray-500">Start checking in to see your progress!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}