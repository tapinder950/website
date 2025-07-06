"use client"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Calendar, 
  CreditCard, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  User,
  DollarSign,
  Wallet,
  RefreshCw,
  ArrowUpRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { differenceInDays, format, parseISO } from "date-fns"

interface SubscriptionData {
  status: 'active' | 'expired' | 'inactive'
  startDate?: string
  endDate?: string
  daysLeft?: number
  totalPaid: number
  totalMonths: number
  paymentCount: number
}

interface PaymentHistory {
  id: string
  amount: number
  paymentDate: string
  monthsAdded: number
  paymentMethod: string
  description: string
  note?: string
}

export default function MemberSubscriptionPage() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    status: 'inactive',
    totalPaid: 0,
    totalMonths: 0,
    paymentCount: 0
  })
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [gymId, setGymId] = useState<string | null>(null)

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        throw new Error("User not authenticated")
      }

      // Get member information
      const { data: member, error: memberError } = await supabase
        .from("members")
        .select("id, gym_id, name")
        .eq("user_id", user.id)
        .single()

      if (memberError || !member) {
        throw new Error("Member information not found")
      }

      setMemberId(member.id)
      setGymId(member.gym_id)

      // Fetch subscription payments from payments table
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("gym_id", member.gym_id)
        .eq("payment_type", "subscription")
        .eq("payment_status", "completed")
        .filter("metadata->>member_id", "eq", member.id)
        .order("payment_date", { ascending: false })

      let payments: PaymentHistory[] = []
      let subscription: SubscriptionData = {
        status: 'inactive',
        totalPaid: 0,
        totalMonths: 0,
        paymentCount: 0
      }

      if (!paymentsError && paymentsData && paymentsData.length > 0) {
        // Process payments
        payments = paymentsData.map(payment => ({
          id: payment.id,
          amount: payment.amount || 0,
          paymentDate: payment.payment_date ? new Date(payment.payment_date).toISOString() : new Date().toISOString(),
          monthsAdded: payment.metadata?.months_added || 1,
          paymentMethod: payment.payment_method || 'Unknown',
          description: payment.description || `${payment.metadata?.months_added || 1} month subscription`,
          note: payment.metadata?.note || ''
        }))

        // Calculate subscription status based on latest payment
        const latestPayment = paymentsData[0]
        const startDate = latestPayment.metadata?.start_date ? new Date(latestPayment.metadata.start_date) : new Date(latestPayment.payment_date || new Date())
        const endDate = latestPayment.metadata?.end_date ? new Date(latestPayment.metadata.end_date) : (() => {
          const calculatedEndDate = new Date(startDate)
          const monthsAdded = latestPayment.metadata?.months_added || 1
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + monthsAdded)
          return calculatedEndDate
        })()

        const now = new Date()
        const daysLeft = differenceInDays(endDate, now)
        
        subscription = {
          status: endDate > now ? 'active' : 'expired',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          daysLeft: daysLeft,
          totalPaid: paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0),
          totalMonths: paymentsData.reduce((sum, p) => sum + (p.metadata?.months_added || 1), 0),
          paymentCount: paymentsData.length
        }
      } else {
        // Try fallback method with subscriptions table
        const { data: subscriptionsData, error: subscriptionsError } = await supabase
          .from("subscriptions")
          .select(`
            *,
            subscription_payments (*)
          `)
          .eq("gym_id", member.gym_id)
          .order("created_at", { ascending: false })

        if (!subscriptionsError && subscriptionsData) {
          const memberSubscriptions = subscriptionsData.filter(sub => 
            sub.subscription_payments?.some(payment => 
              payment.note?.includes(`(ID: ${member.id})`) || 
              payment.note?.includes(member.name)
            )
          )

          if (memberSubscriptions.length > 0) {
            const latestSub = memberSubscriptions[0]
            const endDate = new Date(latestSub.end_date || new Date())
            const now = new Date()
            const daysLeft = differenceInDays(endDate, now)

            subscription = {
              status: latestSub.status === 'active' && endDate > now ? 'active' : 'expired',
              startDate: latestSub.start_date,
              endDate: latestSub.end_date,
              daysLeft: daysLeft,
              totalPaid: latestSub.subscription_payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
              totalMonths: latestSub.subscription_payments?.reduce((sum, p) => sum + (p.months_added || 1), 0) || 0,
              paymentCount: latestSub.subscription_payments?.length || 0
            }

            payments = latestSub.subscription_payments?.map(payment => ({
              id: payment.id,
              amount: payment.amount || 0,
              paymentDate: payment.paid_on ? new Date(payment.paid_on).toISOString() : new Date().toISOString(),
              monthsAdded: payment.months_added || 1,
              paymentMethod: 'Cash', // Default for legacy payments
              description: `${payment.months_added || 1} month subscription`,
              note: payment.note || ''
            })) || []
          }
        }
      }

      setSubscriptionData(subscription)
      setPaymentHistory(payments)

    } catch (error) {
      console.error('Error fetching subscription data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchSubscriptionData()
    setRefreshing(false)
  }, [fetchSubscriptionData])

  useEffect(() => {
    fetchSubscriptionData()
  }, [fetchSubscriptionData])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getUrgencyLevel = (): 'safe' | 'warning' | 'danger' => {
    if (subscriptionData.status !== 'active' || !subscriptionData.daysLeft) return 'safe'
    
    if (subscriptionData.daysLeft <= 3) return 'danger'
    if (subscriptionData.daysLeft <= 7) return 'warning'
    return 'safe'
  }

  const urgencyLevel = getUrgencyLevel()

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your gym membership and view payment history</p>
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

      {/* Current Subscription Status */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-white to-gray-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(subscriptionData.status)}
              Subscription Status
            </CardTitle>
            <Badge
              variant={
                subscriptionData.status === "active" ? "default" :
                subscriptionData.status === "expired" ? "destructive" : "secondary"
              }
              className="px-3 py-1"
            >
              {subscriptionData.status.charAt(0).toUpperCase() + subscriptionData.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Details */}
          {subscriptionData.status === 'active' && subscriptionData.endDate && (
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-green-800">Active Membership</h3>
                {subscriptionData.daysLeft !== undefined && subscriptionData.daysLeft <= 7 && (
                  <Badge
                    variant={urgencyLevel === 'danger' ? 'destructive' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {urgencyLevel === 'danger' && <AlertTriangle className="w-3 h-3" />}
                    <Clock className="w-3 h-3" />
                    {subscriptionData.daysLeft > 0 ? `${subscriptionData.daysLeft} days left` : 
                     subscriptionData.daysLeft === 0 ? 'Expires today' : 
                     `Expired ${Math.abs(subscriptionData.daysLeft)} days ago`}
                  </Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                {subscriptionData.startDate && (
                  <div className="flex justify-between">
                    <span className="text-green-600">Started:</span>
                    <span className="font-medium text-green-800">
                      {format(parseISO(subscriptionData.startDate), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-green-600">Expires:</span>
                  <span className="font-medium text-green-800">
                    {format(parseISO(subscriptionData.endDate), 'MMM dd, yyyy')}
                  </span>
                </div>
                {subscriptionData.daysLeft !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-green-600">Days Remaining:</span>
                    <span className={cn(
                      "font-medium",
                      urgencyLevel === 'danger' ? 'text-red-600' :
                      urgencyLevel === 'warning' ? 'text-amber-600' : 'text-green-600'
                    )}>
                      {subscriptionData.daysLeft > 0 ? `${subscriptionData.daysLeft} days` : 
                       subscriptionData.daysLeft === 0 ? 'Expires today' : 
                       `Expired ${Math.abs(subscriptionData.daysLeft)} days ago`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {subscriptionData.status === 'expired' && (
            <div className="bg-red-50 rounded-xl p-4">
              <h3 className="font-semibold text-red-800 mb-3">Membership Expired</h3>
              <p className="text-sm text-red-700 mb-3">
                Your membership has expired. Please contact the gym to renew your subscription.
              </p>
              {subscriptionData.endDate && (
                <div className="text-sm">
                  <span className="text-red-600">Expired on: </span>
                  <span className="font-medium text-red-800">
                    {format(parseISO(subscriptionData.endDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>
          )}

          {subscriptionData.status === 'inactive' && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">No Active Subscription</h3>
              <p className="text-sm text-gray-700">
                You don't have an active subscription. Please contact the gym to get started.
              </p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Paid</p>
                <p className="text-xl font-bold text-blue-700">₹{subscriptionData.totalPaid.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Months</p>
                <p className="text-xl font-bold text-purple-700">{subscriptionData.totalMonths}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Payments Made</p>
                <p className="text-xl font-bold text-green-700">{subscriptionData.paymentCount}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            <CardTitle>Payment History</CardTitle>
            <Badge variant="outline" className="ml-2">{paymentHistory.length} payments</Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          {paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {paymentHistory.map((payment, index) => (
                <div key={payment.id} className="relative">
                  {index !== paymentHistory.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-green-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          Payment #{paymentHistory.length - index}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {payment.monthsAdded} month{payment.monthsAdded !== 1 ? 's' : ''}
                          </Badge>
                          <Badge variant="secondary" className="bg-green-50 text-green-700 font-medium">
                            ₹{payment.amount.toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Paid on {format(parseISO(payment.paymentDate), 'MMMM dd, yyyy')}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                        </div>
                        
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 mt-0.5 flex-shrink-0">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          </div>
                          <p className="text-gray-600">{payment.description}</p>
                        </div>
                        
                        {payment.note && (
                          <div className="flex items-start gap-2 mt-2">
                            <div className="w-4 h-4 mt-0.5 flex-shrink-0">
                              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            </div>
                            <p className="text-gray-600 italic">{payment.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
              <p className="text-gray-600">You haven't made any payments yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}