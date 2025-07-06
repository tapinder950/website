"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useGym } from "../layout"
import MemberSubscriptionPanel from "@/components/owner/MemberSubscriptionPanel"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  UserCircle2, 
  Search, 
  Filter, 
  Users, 
  TrendingUp,
  Calendar,
  DollarSign,
  RefreshCw,
  Download,
  Grid3X3,
  List
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { differenceInDays } from "date-fns"

interface Member {
  id: string
  name: string
  email: string
  created_at: string
  status?: 'active' | 'expired' | 'cancelled'
  subscription_end?: string
  total_paid?: number
}

const ITEMS_PER_PAGE = 20

export default function OwnerSubscriptionsPage() {
  const { gymId } = useGym()
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name")
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    totalRevenue: 0
  })

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!gymId) {
        setLoading(false)
        return
      }
      
      // Fetch members data - since there's no member-level subscription table,
      // we'll show members with basic info and mock subscription status
      console.log('Fetching members for gym_id:', gymId)
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("*")
        .eq("gym_id", gymId)
        .order('name')

      if (membersError) {
        console.error('Members query error:', membersError)
        throw membersError
      }

      console.log('Found members:', membersData?.length || 0)

      // Fetch gym-level subscription plans
      const { data: gymSubscriptionsData, error: gymSubError } = await supabase
        .from("gym_subscriptions")
        .select("*")
        .eq("gym_id", gymId)

      if (gymSubError) {
        console.error('Gym subscriptions query error:', gymSubError)
        // Don't throw error, just log it as gym subscriptions are optional
      }

      console.log('Found gym subscription plans:', gymSubscriptionsData?.length || 0)

      // Fetch member subscription payments from payments table
      const { data: memberPaymentsData, error: memberPaymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("gym_id", gymId)
        .eq("payment_type", "subscription")
        .eq("payment_status", "completed")
        .order("payment_date", { ascending: false })

      if (memberPaymentsError) {
        console.error('Member payments query error:', memberPaymentsError)
      }

      console.log('Found member subscription payments:', memberPaymentsData?.length || 0)

      // Process members data with their subscription payment information
      const processedMembers = membersData?.map(member => {
        // Find payments for this member
        const memberPayments = memberPaymentsData?.filter(payment => 
          payment.metadata?.member_id === member.id
        ) || []
        
        const totalPaid = memberPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
        
        // Calculate subscription status based on latest payment
        let status = 'no_subscription'
        let subscriptionEnd = null
        
        if (memberPayments.length > 0) {
          const latestPayment = memberPayments[0]
          const endDate = latestPayment.metadata?.end_date
          
          if (endDate) {
            const endDateTime = new Date(endDate)
            const now = new Date()
            status = endDateTime > now ? 'active' : 'expired'
            subscriptionEnd = endDate
          }
        }

        return {
          ...member,
          status: status,
          subscription_end: subscriptionEnd,
          total_paid: totalPaid,
          subscriptions: memberPayments // Store payments as subscriptions for compatibility
        }
      }) || []

      setMembers(processedMembers)
      
      // Calculate stats
      const totalMembers = processedMembers.length
      const activeMembers = processedMembers.filter(m => m.status === 'active').length
      const expiredMembers = processedMembers.filter(m => m.status === 'expired').length
      
      // Calculate revenue from member subscription payments
      const totalRevenue = memberPaymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
      
      setStats({
        total: totalMembers,
        active: activeMembers,
        expired: expiredMembers,
        totalRevenue
      })

    } catch (error) {
      console.error('Error fetching members:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }, [gymId])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchMembers()
    setRefreshing(false)
  }, [fetchMembers])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Memoized filtered and sorted members
  const filteredMembers = useMemo(() => {
    let filtered = members.filter(member => {
      const matchesSearch = 
        member.name?.toLowerCase().includes(search.toLowerCase()) ||
        member.email?.toLowerCase().includes(search.toLowerCase())
      
      const matchesStatus = statusFilter === "all" || member.status === statusFilter
      
      return matchesSearch && matchesStatus
    })

    // Sort members
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name?.localeCompare(b.name || '') || 0
        case 'email':
          return a.email?.localeCompare(b.email || '') || 0
        case 'status':
          return a.status?.localeCompare(b.status || '') || 0
        case 'revenue':
          return (b.total_paid || 0) - (a.total_paid || 0)
        case 'expiry':
          if (!a.subscription_end) return 1
          if (!b.subscription_end) return -1
          return new Date(a.subscription_end).getTime() - new Date(b.subscription_end).getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [members, search, statusFilter, sortBy])

  // Pagination
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredMembers, currentPage])

  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE)

  const getStatusBadge = (member: Member) => {
    if (member.status === 'active') {
      const daysLeft = member.subscription_end 
        ? differenceInDays(new Date(member.subscription_end), new Date())
        : 0
      
      if (daysLeft <= 3) {
        return <Badge variant="destructive" className="text-xs">Expiring Soon</Badge>
      }
      return <Badge variant="default" className="text-xs bg-green-500">Active</Badge>
    }
    
    if (member.status === 'expired') {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>
    }
    
    return <Badge variant="outline" className="text-xs">No Subscription</Badge>
  }

  const exportData = useCallback(() => {
    const csvContent = [
      ['Name', 'Email', 'Status', 'Total Revenue', 'Subscription End'],
      ...filteredMembers.map(member => [
        member.name || '',
        member.email || '',
        member.status || '',
        member.total_paid?.toString() || '0',
        member.subscription_end || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `members-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredMembers])

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row gap-6 max-w-7xl mx-auto py-8 px-4">
        <aside className="w-full md:w-80">
          <Skeleton className="h-[600px] rounded-2xl" />
        </aside>
        <main className="flex-1">
          <Skeleton className="h-[400px] rounded-2xl" />
        </main>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Calendar className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expired}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Enhanced Sidebar */}
        <aside className="w-full lg:w-80 bg-white rounded-2xl shadow-lg border p-6 h-fit lg:sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Members</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              >
                {viewMode === 'list' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search members..."
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="no_subscription">No Subscription</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expiry">Expiry Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportData}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Members List */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {paginatedMembers.map(member => (
              <div
                key={member.id}
                onClick={() => setSelected(member)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer hover:shadow-md",
                  selected?.id === member.id
                    ? "bg-blue-50 border-2 border-blue-200 shadow-md"
                    : "hover:bg-gray-50 border border-gray-100"
                )}
              >
                <div className="relative">
                  <UserCircle2 className="w-10 h-10 text-gray-400" />
                  {member.status === 'active' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{member.name}</div>
                  <div className="text-xs text-gray-500 truncate">{member.email}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(member)}
                    {member.total_paid > 0 && (
                      <span className="text-xs text-green-600 font-medium">
                        ₹{member.total_paid.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredMembers.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No members found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </aside>

        {/* Main Panel */}
        <main className="flex-1">
          {selected ? (
            <MemberSubscriptionPanel 
              member={selected} 
              onUpdate={fetchMembers}
            />
          ) : (
            <Card className="h-96 flex items-center justify-center shadow-lg">
              <div className="text-center text-gray-500">
                <UserCircle2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Select a Member</h3>
                <p className="text-sm">Choose a member from the sidebar to view their subscription details</p>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}