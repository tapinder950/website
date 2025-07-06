"use client"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Loader2, 
  UserCircle2, 
  CheckCircle2, 
  Calendar,
  Clock,
  Trophy,
  TrendingUp,
  MapPin,
  Activity,
  Zap,
  Target,
  Award,
  Timer,
  AlertCircle,
  Star
} from "lucide-react"
import { format, differenceInDays, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"

function getDaysLeft(endDate: Date) {
  if (!endDate) return 0
  const ms = endDate.getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

function getTimeSpent(checkIn: string, checkOut?: string) {
  const start = new Date(checkIn)
  const end = checkOut ? new Date(checkOut) : new Date()
  const diffMs = end.getTime() - start.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

export default function MemberDashboard() {
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    status: "No subscription",
    daysLeft: 0,
    endDate: null as null | Date,
    subStatusColor: "bg-gray-100 text-gray-500 border-gray-200",
    urgencyLevel: "safe" as "safe" | "warning" | "danger"
  })
  const [checkins, setCheckins] = useState<any[]>([])
  const [currentCheckIn, setCurrentCheckIn] = useState<any>(null)
  const [monthlyStats, setMonthlyStats] = useState({ visits: 0, totalTime: 0 })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Get current user
      const { data: userRes } = await supabase.auth.getUser()
      if (!userRes?.user?.id) return

      // 2. Get member
      const { data: memberData } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", userRes.user.id)
        .single()
      setMember(memberData)
      if (!memberData) return

      // 3. Get member subscription data from payments table (primary method)
      const { data: memberPayments } = await supabase
        .from("payments")
        .select("*")
        .eq("gym_id", memberData.gym_id)
        .eq("payment_type", "subscription")
        .eq("payment_status", "completed")
        .filter("metadata->>member_id", "eq", memberData.id)
        .order("payment_date", { ascending: false })
        .limit(1)

      let latestPayment = null
      let expiry = null

      if (memberPayments && memberPayments.length > 0) {
        latestPayment = memberPayments[0]
        // Use end_date from metadata if available, otherwise calculate from payment date
        if (latestPayment.metadata?.end_date) {
          expiry = new Date(latestPayment.metadata.end_date)
        } else {
          const startDate = latestPayment.metadata?.start_date ? new Date(latestPayment.metadata.start_date) : new Date(latestPayment.payment_date)
          const monthsAdded = latestPayment.metadata?.months_added || 1
          expiry = new Date(startDate)
          expiry.setMonth(expiry.getMonth() + monthsAdded)
        }
      } else {
        // Fallback: Check subscriptions table with gym_id filter
        const { data: gymSubscriptions } = await supabase
          .from("subscriptions")
          .select(`
            *,
            subscription_payments (*)
          `)
          .eq("gym_id", memberData.gym_id)
          .order("created_at", { ascending: false })

        if (gymSubscriptions && gymSubscriptions.length > 0) {
          // Find subscription with member info in payment notes
          for (const sub of gymSubscriptions) {
            const memberPayment = sub.subscription_payments?.find((payment: any) => 
              payment.note?.includes(`(ID: ${memberData.id})`) || 
              payment.note?.includes(memberData.name)
            )
            
            if (memberPayment) {
              latestPayment = memberPayment
              const paidOn = new Date(memberPayment.paid_on)
              const months = memberPayment.months_added || 1
              expiry = new Date(paidOn)
              expiry.setMonth(expiry.getMonth() + months)
              break
            }
          }
        }
      }

      // 5. Determine status
      let subStatus = "No subscription"
      let subStatusColor = "bg-gray-100 text-gray-500 border-gray-200"
      let urgencyLevel: "safe" | "warning" | "danger" = "safe"
      let daysLeft = expiry ? getDaysLeft(expiry) : 0

      if (latestPayment && expiry) {
        if (daysLeft > 0) {
          subStatus = "Active"
          subStatusColor = "bg-green-100 text-green-700 border-green-200"
          if (daysLeft <= 3) urgencyLevel = "danger"
          else if (daysLeft <= 7) urgencyLevel = "warning"
        } else {
          subStatus = "Expired"
          subStatusColor = "bg-red-100 text-red-700 border-red-200"
          urgencyLevel = "danger"
        }
      }

      setSubscriptionStatus({
        status: subStatus,
        daysLeft,
        endDate: expiry,
        subStatusColor,
        urgencyLevel
      })

      // 6. Check-ins
      const { data: chks } = await supabase
        .from("checkins")
        .select("*")
        .eq("member_id", memberData.id)
        .order("check_in", { ascending: false })
        .limit(10)
      setCheckins(chks || [])

      // Current check-in (not checked out)
      const { data: currentChk } = await supabase
        .from("checkins")
        .select("*")
        .eq("member_id", memberData.id)
        .is("check_out", null)
        .order("check_in", { ascending: false })
        .limit(1)
      setCurrentCheckIn(currentChk?.[0] || null)

      // Monthly statistics
      const startOfThisMonth = startOfMonth(new Date())
      const endOfThisMonth = endOfMonth(new Date())
      const { data: monthlyCheckins } = await supabase
        .from("checkins")
        .select("*")
        .eq("member_id", memberData.id)
        .gte("check_in", startOfThisMonth.toISOString())
        .lte("check_in", endOfThisMonth.toISOString())

      const visits = monthlyCheckins?.length || 0
      const totalTime = monthlyCheckins?.reduce((acc, checkin) => {
        if (checkin.check_out) {
          const duration = new Date(checkin.check_out).getTime() - new Date(checkin.check_in).getTime()
          return acc + duration
        }
        return acc
      }, 0) || 0

      setMonthlyStats({ 
        visits, 
        totalTime: Math.floor(totalTime / (1000 * 60 * 60)) // hours
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2 w-6 h-6" />
        <span>Loading your dashboard...</span>
      </div>
    )
  }

  // Check-in status
  let checkinStatus = "Not checked in"
  let checkinStatusColor = "bg-gray-100 text-gray-500 border-gray-200"
  let checkinTimeString = ""
  let currentSessionTime = ""

  if (currentCheckIn) {
    checkinStatus = "Checked in"
    checkinStatusColor = "bg-blue-100 text-blue-700 border-blue-200"
    checkinTimeString = format(new Date(currentCheckIn.check_in), 'h:mm a')
    currentSessionTime = getTimeSpent(currentCheckIn.check_in)
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">This Month</p>
                <p className="text-2xl font-bold">{monthlyStats.visits}</p>
                <p className="text-blue-100 text-xs">Visits</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Time</p>
                <p className="text-2xl font-bold">{monthlyStats.totalTime}h</p>
                <p className="text-green-100 text-xs">This month</p>
              </div>
              <Clock className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Streak</p>
                <p className="text-2xl font-bold">5</p>
                <p className="text-purple-100 text-xs">Days</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Level</p>
                <p className="text-2xl font-bold">12</p>
                <p className="text-orange-100 text-xs">Fitness</p>
              </div>
              <Zap className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Status Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Membership Status */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCircle2 className="w-5 h-5 text-green-600" />
              Membership Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={cn("px-3 py-1 font-medium", subscriptionStatus.subStatusColor)}>
                  {subscriptionStatus.status}
                </Badge>
                {subscriptionStatus.urgencyLevel === 'danger' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              
              {subscriptionStatus.status === "Active" && subscriptionStatus.endDate && (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Days remaining:</span>
                    <span className={cn(
                      "font-bold",
                      subscriptionStatus.urgencyLevel === 'danger' ? 'text-red-600' :
                      subscriptionStatus.urgencyLevel === 'warning' ? 'text-orange-600' : 'text-green-600'
                    )}>
                      {subscriptionStatus.daysLeft} day{subscriptionStatus.daysLeft !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Progress</span>
                      <span>{Math.max(0, 100 - Math.floor((subscriptionStatus.daysLeft / 30) * 100))}% used</span>
                    </div>
                    <Progress 
                      value={Math.max(0, 100 - Math.floor((subscriptionStatus.daysLeft / 30) * 100))} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                    <div className="flex justify-between">
                      <span>Expires:</span>
                      <span className="font-medium">
                        {format(subscriptionStatus.endDate, 'MMM dd, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {subscriptionStatus.status === "Expired" && subscriptionStatus.endDate && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    Your membership expired on {format(subscriptionStatus.endDate, 'MMM dd, yyyy')}
                  </p>
                  <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700">
                    Renew Membership
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Check-in Status */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
              Check-in Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={cn("px-3 py-1 font-medium", checkinStatusColor)}>
                  {checkinStatus}
                </Badge>
                {currentCheckIn && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Activity className="w-4 h-4" />
                    <span>Active</span>
                  </div>
                )}
              </div>
              
              {currentCheckIn && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-blue-700 font-medium">Current Session</span>
                      <Timer className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-600">Checked in at:</span>
                        <span className="font-medium text-blue-800">{checkinTimeString}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-600">Session time:</span>
                        <span className="font-medium text-blue-800">{currentSessionTime}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    Check Out
                  </Button>
                </div>
              )}
              
              {!currentCheckIn && (
                <div className="text-center py-4">
                  <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-3">Ready to start your workout?</p>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Check In Now
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkins.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No check-ins yet</p>
              <p className="text-sm text-gray-500">Your workout history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkins.slice(0, 5).map((checkin, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {format(new Date(checkin.check_in), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(checkin.check_in), 'h:mm a')} - {' '}
                        {checkin.check_out 
                          ? format(new Date(checkin.check_out), 'h:mm a')
                          : 'Ongoing'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {checkin.check_out 
                          ? getTimeSpent(checkin.check_in, checkin.check_out)
                          : getTimeSpent(checkin.check_in)
                        }
                      </span>
                    </div>
                    {i === 0 && checkins.length > 1 && (
                      <Badge variant="outline" className="mt-1 text-xs bg-green-50 text-green-700">
                        Latest
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {checkins.length > 5 && (
                <Button variant="outline" className="w-full mt-3">
                  View All Activity
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievement Preview */}
      <Card className="shadow-lg bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Award className="w-5 h-5" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">First Week</p>
                <p className="text-xs text-gray-600">Completed 5 workouts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Consistency</p>
                <p className="text-xs text-gray-600">5 day streak</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-green-400 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Progress</p>
                <p className="text-xs text-gray-600">Level 12 reached</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
