"use client"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { useStaffGym } from "@/app/dashboards/staff/layout"
import AddMemberDialog from "./AddMemberDialog"
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Download,
  Grid3X3,
  List,
  RefreshCw,
  UserPlus,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface Member {
  id: string
  name: string
  email: string
  phone_number: string
  address: string
  created_at: string
  status?: 'active' | 'inactive'
}

interface StaffMemberCardProps {
  refresh: number
  searchTerm?: string
  isCompact?: boolean
}

export default function StaffMemberCard({ refresh, searchTerm = "", isCompact = false }: StaffMemberCardProps) {
  const { gymId } = useStaffGym()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchTerm)
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'created_at'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const fetchMembers = useCallback(async () => {
    if (!gymId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error("Error fetching members:", error)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers, refresh])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMembers()
    setRefreshing(false)
  }

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members.filter(member => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        member.email.toLowerCase().includes(searchInput.toLowerCase()) ||
        member.phone_number?.toLowerCase().includes(searchInput.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' || member.status === filterStatus
      
      return matchesSearch && matchesStatus
    })

    return filtered.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      if (sortBy === 'created_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else {
        aValue = aValue?.toLowerCase() || ''
        bValue = bValue?.toLowerCase() || ''
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }, [members, searchInput, sortBy, sortOrder, filterStatus])

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Address', 'Created At', 'Status']
    const csvData = filteredAndSortedMembers.map(member => [
      member.name,
      member.email,
      member.phone_number || '',
      member.address || '',
      format(new Date(member.created_at), 'yyyy-MM-dd'),
      member.status || 'active'
    ])
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `members-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isCompact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Members ({filteredAndSortedMembers.length})
            </CardTitle>
            <AddMemberDialog onAdded={fetchMembers} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredAndSortedMembers.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                  {member.status || 'active'}
                </Badge>
              </div>
            ))}
            {filteredAndSortedMembers.length === 0 && (
              <p className="text-center text-gray-500 py-4">No members found</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Members Management ({filteredAndSortedMembers.length})
          </CardTitle>
          
          <div className="flex items-center gap-2">
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
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            
            <AddMemberDialog onAdded={fetchMembers} />
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search members..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field as any)
              setSortOrder(order as any)
            }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="email-asc">Email A-Z</SelectItem>
                <SelectItem value="email-desc">Email Z-A</SelectItem>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredAndSortedMembers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-500 mb-6">
              {searchInput ? "No members match your search criteria" : "Get started by adding your first member"}
            </p>
            <AddMemberDialog onAdded={fetchMembers} />
          </div>
        ) : (
          <div className={cn(
            "gap-4",
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
              : "space-y-4"
          )}>
            {filteredAndSortedMembers.map((member) => (
              <Card key={member.id} className={cn(
                "transition-all duration-200 hover:shadow-md",
                viewMode === 'list' && "p-0"
              )}>
                <CardContent className={cn(
                  "p-4",
                  viewMode === 'list' && "flex items-center justify-between"
                )}>
                  <div className={cn(
                    "space-y-3",
                    viewMode === 'list' && "space-y-1 flex-1"
                  )}>
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">
                        {member.name}
                      </h3>
                      <Badge 
                        variant={member.status === 'active' ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {member.status || 'active'}
                      </Badge>
                    </div>
                    
                    <div className={cn(
                      "space-y-2 text-sm text-gray-600",
                      viewMode === 'list' && "space-y-1"
                    )}>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      
                      {member.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{member.phone_number}</span>
                        </div>
                      )}
                      
                      {member.address && viewMode === 'grid' && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{member.address}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>Joined {format(new Date(member.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}