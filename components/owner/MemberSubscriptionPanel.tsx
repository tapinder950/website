"use client"
import { useEffect, useState, useCallback } from "react"
import { differenceInDays, format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import AddSubscriptionDialog from "./AddSubscriptionDialog"
import EditSubscriptionDialog from "./EditSubscriptionDialog"
import { 
  ArrowUpRight, 
  Calendar, 
  Wallet, 
  TrendingUp,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  History,
  CreditCard,
  User,
  Mail,
  Phone
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface Subscription {
  id: string
  start_date: string
  end_date: string
  status: 'active' | 'expired' | 'cancelled'
  member_id: string
}

interface Payment {
  id: string
  subscription_id: string
  paid_on: string
  amount: number
  months_added: number
  note?: string
}

export default function MemberSubscriptionPanel({ 
  member, 
  onUpdate 
}: { 
  member: any
  onUpdate: () => void 
}) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!member.gym_id) {
        console.error('Member gym_id not found')
        setSubscriptions([])
        setPayments([])
        setLoading(false)
        return
      }
      
      // Try to fetch from payments table first
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("gym_id", member.gym_id)
        .eq("payment_type", "subscription")
        .eq("payment_status", "completed")
        .filter("metadata->>member_id", "eq", member.id)
        .order("payment_date", { ascending: false })

      let allPayments = []
      let allSubscriptions = []

      // If payments table works, use that data
      if (!paymentsError && paymentsData && paymentsData.length > 0) {
        console.log('Found payments in payments table:', paymentsData.length)
        
        allPayments = paymentsData.map(payment => ({
          id: payment.id,
          subscription_id: payment.id,
          paid_on: payment.payment_date ? new Date(payment.payment_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          amount: payment.amount || 0,
          months_added: payment.metadata?.months_added || 1,
          note: payment.description || payment.metadata?.note || ''
        }))

        const latestPayment = paymentsData[0]
        const startDate = latestPayment.metadata?.start_date ? new Date(latestPayment.metadata.start_date) : new Date(latestPayment.payment_date || new Date())
        const endDate = latestPayment.metadata?.end_date ? new Date(latestPayment.metadata.end_date) : (() => {
          const calculatedEndDate = new Date(startDate)
          const monthsAdded = latestPayment.metadata?.months_added || 1
          calculatedEndDate.setMonth(calculatedEndDate.getMonth() + monthsAdded)
          return calculatedEndDate
        })()
        
        allSubscriptions = [{
          id: latestPayment.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: endDate > new Date() ? 'active' : 'expired' as 'active' | 'expired' | 'cancelled',
          member_id: member.id
        }]
      } else {
        // Fallback: Try subscription_payments with member info in note
        console.log('Payments table access failed, trying subscription_payments fallback...')
        
        const { data: subscriptionsData, error: subscriptionsError } = await supabase
          .from("subscriptions")
          .select(`
            *,
            subscription_payments (*)
          `)
          .eq("gym_id", member.gym_id)
          .order("created_at", { ascending: false })

        if (!subscriptionsError && subscriptionsData) {
          // Filter for member by checking note field
          const memberSubscriptions = subscriptionsData.filter(sub => 
            sub.subscription_payments?.some(payment => 
              payment.note?.includes(`(ID: ${member.id})`) || 
              payment.note?.includes(member.name)
            )
          )

          console.log('Found subscriptions in fallback method:', memberSubscriptions.length)

          if (memberSubscriptions.length > 0) {
            const latestSub = memberSubscriptions[0]
            allSubscriptions = [{
              id: latestSub.id,
              start_date: latestSub.start_date || new Date().toISOString(),
              end_date: latestSub.end_date || new Date().toISOString(),
              status: latestSub.status as 'active' | 'expired' | 'cancelled',
              member_id: member.id
            }]

            allPayments = latestSub.subscription_payments?.map(payment => ({
              id: payment.id,
              subscription_id: latestSub.id,
              paid_on: payment.paid_on || new Date().toISOString().split('T')[0],
              amount: payment.amount || 0,
              months_added: payment.months_added || 1,
              note: payment.note || ''
            })) || []
          }
        }
      }

      setPayments(allPayments)
      setSubscriptions(allSubscriptions)
      
      console.log('Member subscription data fetched successfully')
    } catch (error) {
      console.error('Error fetching subscription data:', error)
      setSubscriptions([])
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [member.id])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    await onUpdate()
    setRefreshing(false)
  }, [fetchData, onUpdate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const latestSubscription = subscriptions.find(s => s.status === "active") || subscriptions[0]
  const totalRevenue = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  const totalMonths = payments.reduce((sum, payment) => sum + payment.months_added, 0)

  let daysLeft = null
  let urgencyLevel: 'safe' | 'warning' | 'danger' = 'safe'

  if (latestSubscription && latestSubscription.status === 'active') {
    const today = new Date()
    const endDate = parseISO(latestSubscription.end_date)
    daysLeft = differenceInDays(endDate, today)
    
    if (daysLeft <= 3) urgencyLevel = 'danger'
    else if (daysLeft <= 7) urgencyLevel = 'warning'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Schema Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-800">Member Subscription Tracking</h3>
              <p className="text-sm text-blue-700 mt-1">
                Individual member subscriptions are tracked through the payments system. 
                Subscription payments are stored with member information in the metadata.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Member Profile Card */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-white to-gray-50">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                {latestSubscription?.status === 'active' && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{member.email}</span>
                </div>
                {member.phone && (
                  <div className="flex items-center gap-2 text-gray-600 mt-1">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{member.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:ml-auto">
              {latestSubscription ? (
                <>
                  <Badge
                    variant={
                      latestSubscription.status === "active" ? "default" :
                      latestSubscription.status === "expired" ? "destructive" : "secondary"
                    }
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {getStatusIcon(latestSubscription.status)}
                    {latestSubscription.status.charAt(0).toUpperCase() + latestSubscription.status.slice(1)}
                  </Badge>
                  
                  {daysLeft !== null && latestSubscription.status === 'active' && (
                    <Badge
                      variant={urgencyLevel === 'danger' ? 'destructive' : urgencyLevel === 'warning' ? 'secondary' : 'outline'}
                      className="flex items-center gap-1"
                    >
                      {urgencyLevel === 'danger' && <AlertTriangle className="w-3 h-3" />}
                      <Clock className="w-3 h-3" />
                      {daysLeft > 0 ? `${daysLeft} days left` : 
                       daysLeft === 0 ? 'Expires today' : 
                       `Expired ${Math.abs(daysLeft)} days ago`}
                    </Badge>
                  )}
                  
                  <EditSubscriptionDialog
                    subscription={latestSubscription}
                    onUpdated={handleRefresh}
                  />
                </>
              ) : (
                <Badge variant="outline" className="px-3 py-1">
                  No Active Subscription
                </Badge>
              )}
              
              <AddSubscriptionDialog 
                member={member} 
                onAdded={handleRefresh}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                <p className="text-xl font-bold text-green-700">₹{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Months</p>
                <p className="text-xl font-bold text-blue-700">{totalMonths}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Payments</p>
                <p className="text-xl font-bold text-purple-700">{payments.length}</p>
              </div>
            </div>
          </div>

          {/* Current Subscription Details */}
          {latestSubscription && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Current Subscription
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium">
                    {format(parseISO(latestSubscription.start_date), 'MMM dd, yyyy')} - {format(parseISO(latestSubscription.end_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                {daysLeft !== null && latestSubscription.status === 'active' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Days Remaining:</span>
                    <span className={cn(
                      "font-medium",
                      urgencyLevel === 'danger' ? 'text-red-600' :
                      urgencyLevel === 'warning' ? 'text-amber-600' : 'text-green-600'
                    )}>
                      {daysLeft > 0 ? `${daysLeft} days` : 
                       daysLeft === 0 ? 'Expires today' : 
                       `Expired ${Math.abs(daysLeft)} days ago`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Payment History */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Payment History</h2>
            <Badge variant="outline" className="ml-2">{payments.length} payments</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <TrendingUp className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>
        
        <CardContent>
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment, index) => (
                <div key={payment.id} className="relative">
                  {index !== payments.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          Payment #{payments.length - index}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">
                            {payment.months_added} month{payment.months_added !== 1 ? 's' : ''}
                          </Badge>
                          {payment.amount && (
                            <Badge variant="secondary" className="bg-green-50 text-green-700 font-medium">
                              ₹{payment.amount.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Paid on {format(parseISO(payment.paid_on), 'MMMM dd, yyyy')}</span>
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
              <p className="text-gray-600 mb-4">This member hasn't made any payments yet.</p>
              <AddSubscriptionDialog 
                member={member} 
                onAdded={handleRefresh}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}