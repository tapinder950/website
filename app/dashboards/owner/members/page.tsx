"use client"
import { useEffect, useState, useMemo, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useGym } from "../layout"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  BarChart, 
  PieChart, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  TrendingUp,
  UserCheck,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Activity,
  Eye,
  Grid3X3,
  List,
  ChevronUp,
  ChevronDown
} from "lucide-react"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const MembersChart = dynamic(() => import("@/components/owner/MembersChart"), { ssr: false })

interface Member {
  id: string
  name: string
  email: string
  phone_number: string
  address: string
  created_at: string
  status?: 'active' | 'inactive'
}

interface Staff {
  id: string
  name: string
  email: string
  phone_number: string
  address: string
  role?: string
  status?: 'active' | 'inactive' | 'on_leave'
  created_at: string
}

interface Stats {
  totalMembers: number
  totalStaff: number
  activeMembers: number
  newMembersThisMonth: number
  memberGrowthRate: number
}

export default function OwnerMembersPage() {
  const { gymId } = useGym()
  const [members, setMembers] = useState<Member[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterBy, setFilterBy] = useState("all")
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [activeTab, setActiveTab] = useState("overview")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!gymId) {
        setLoading(false)
        return
      }
      
      // Fetch members filtered by gym_id
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })
      
      if (membersError) throw membersError
      
      // Fetch staff filtered by gym_id
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })
      
      if (staffError) throw staffError
      
      setMembers(membersData || [])
      setStaff(staffData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [gymId])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate statistics
  const stats: Stats = useMemo(() => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    const newMembersThisMonth = members.filter(m => 
      new Date(m.created_at) >= thisMonth
    ).length
    
    const newMembersLastMonth = members.filter(m => 
      new Date(m.created_at) >= lastMonth && new Date(m.created_at) < thisMonth
    ).length
    
    const growthRate = newMembersLastMonth > 0 
      ? ((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100
      : newMembersThisMonth > 0 ? 100 : 0

    return {
      totalMembers: members.length,
      totalStaff: staff.length,
      activeMembers: members.filter(m => m.status !== 'inactive').length,
      newMembersThisMonth,
      memberGrowthRate: Math.round(growthRate * 10) / 10
    }
  }, [members, staff])

  // Filter and sort data
  const filteredMembers = useMemo(() => {
    let filtered = members.filter(member => {
      const matchesSearch = 
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterBy === "all" || member.status === filterBy
      
      return matchesSearch && matchesFilter
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || ''
          bValue = b.name?.toLowerCase() || ''
          break
        case 'email':
          aValue = a.email?.toLowerCase() || ''
          bValue = b.email?.toLowerCase() || ''
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [members, searchTerm, filterBy, sortBy, sortOrder])

  const filteredStaff = useMemo(() => {
    return staff.filter(staffMember => {
      const matchesSearch = 
        staffMember.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staffMember.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staffMember.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [staff, searchTerm])

  // Pagination
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredMembers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredMembers, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage)

  const exportData = useCallback((type: 'members' | 'staff') => {
    const data = type === 'members' ? filteredMembers : filteredStaff
    const headers = type === 'members' 
      ? ['Name', 'Email', 'Phone', 'Address', 'Joined Date', 'Status']
      : ['Name', 'Email', 'Phone', 'Address', 'Role', 'Status']
    
    const csvContent = [
      headers,
      ...data.map(item => [
        item.name || '',
        item.email || '',
        item.phone_number || '',
        item.address || '',
        type === 'members' 
          ? format(new Date(item.created_at), 'yyyy-MM-dd')
          : (item as Staff).role || '',
        item.status || 'active'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredMembers, filteredStaff])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 ml-1" /> : 
      <ChevronDown className="w-4 h-4 ml-1" />
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Members & Staff Overview
            </h1>
            <p className="text-gray-600">
              Comprehensive view of your organization's members and staff
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
              <div className="text-xs text-blue-100 mt-1">
                {stats.activeMembers} active
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
              <UserCheck className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStaff}</div>
              <div className="text-xs text-green-100 mt-1">
                All departments
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <Calendar className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newMembersThisMonth}</div>
              <div className="text-xs text-purple-100 mt-1">
                New members
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
              <TrendingUp className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.memberGrowthRate > 0 ? '+' : ''}{stats.memberGrowthRate}%
              </div>
              <div className="text-xs text-orange-100 mt-1">
                Monthly growth
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Staff
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Membership Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MembersChart members={members} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Members</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {stats.activeMembers}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Staff</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {stats.totalStaff}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">New Members</span>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      {stats.newMembersThisMonth}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Growth Rate</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        stats.memberGrowthRate >= 0 
                          ? "bg-green-50 text-green-700" 
                          : "bg-red-50 text-red-700"
                      )}
                    >
                      {stats.memberGrowthRate > 0 ? '+' : ''}{stats.memberGrowthRate}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    All Members ({filteredMembers.length})
                  </CardTitle>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search members..."
                        className="pl-10 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Select value={filterBy} onValueChange={setFilterBy}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                    >
                      {viewMode === 'table' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportData('members')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('name')}
                            className="flex items-center p-0 h-auto font-semibold"
                          >
                            Name
                            <SortIcon field="name" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('email')}
                            className="flex items-center p-0 h-auto font-semibold"
                          >
                            Email
                            <SortIcon field="email" />
                          </Button>
                        </TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort('created_at')}
                            className="flex items-center p-0 h-auto font-semibold"
                          >
                            Joined
                            <SortIcon field="created_at" />
                          </Button>
                        </TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembers.map(member => (
                        <TableRow key={member.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              {member.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {member.phone_number}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="truncate max-w-32">{member.address}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(member.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={member.status === 'active' ? 'default' : 'secondary'}
                              className={cn(
                                member.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              )}
                            >
                              {member.status || 'Active'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {paginatedMembers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No members found matching your criteria
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Show</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    All Staff ({filteredStaff.length})
                  </CardTitle>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search staff..."
                        className="pl-10 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportData('staff')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map(staffMember => (
                        <TableRow key={staffMember.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{staffMember.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              {staffMember.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              {staffMember.phone_number}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="truncate max-w-32">{staffMember.address}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {staffMember.role || 'Staff'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={staffMember.status === 'active' ? 'default' : 'secondary'}
                              className={cn(
                                staffMember.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : staffMember.status === 'on_leave'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              )}
                            >
                              {staffMember.status?.replace('_', ' ') || 'Active'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredStaff.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No staff found matching your criteria
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}