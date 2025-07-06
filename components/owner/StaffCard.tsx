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
import { useGym } from "@/app/dashboards/owner/layout"
import AddStaffDialog from "./AddStaffDialog"
import EditStaffDialog from "./EditStaffDialog"
import DeleteDialog from "@/components/ui/DeleteDialog"
import { 
  UserCheck, 
  Search, 
  Users, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Download,
  Grid3X3,
  List,
  RefreshCw,
  MoreVertical
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface Staff {
  id: string
  name: string
  email: string
  phone_number: string
  address: string
  created_at: string
  role?: string
  status?: 'active' | 'inactive'
}

interface StaffCardProps {
  refresh: number
  searchTerm?: string
  isCompact?: boolean
}

export default function StaffCard({ refresh, searchTerm = "", isCompact = false }: StaffCardProps) {
  const { gymId } = useGym()
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [localSearch, setLocalSearch] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [filterBy, setFilterBy] = useState("all")
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [currentPage, setCurrentPage] = useState(1)
  
  const ITEMS_PER_PAGE = isCompact ? 3 : 10

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!gymId) {
        setLoading(false)
        return
      }
      
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }, [gymId])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchStaff()
    setRefreshing(false)
  }, [fetchStaff])

  useEffect(() => {
    fetchStaff()
  }, [refresh, fetchStaff])

  // Memoized filtered and sorted staff
  const filteredStaff = useMemo(() => {
    const searchQuery = (searchTerm || localSearch).toLowerCase()
    
    let filtered = staff.filter(member => {
      const matchesSearch = 
        member.name?.toLowerCase().includes(searchQuery) ||
        member.email?.toLowerCase().includes(searchQuery) ||
        member.phone_number?.toLowerCase().includes(searchQuery)
      
      const matchesFilter = filterBy === "all" || member.status === filterBy
      
      return matchesSearch && matchesFilter
    })

    // Sort staff
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name?.localeCompare(b.name || '') || 0
        case 'email':
          return a.email?.localeCompare(b.email || '') || 0
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [staff, searchTerm, localSearch, filterBy, sortBy])

  const paginatedStaff = useMemo(() => {
    if (isCompact) return filteredStaff.slice(0, ITEMS_PER_PAGE)
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredStaff.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredStaff, currentPage, isCompact])

  const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE)

  const handleDeleted = useCallback(() => {
    fetchStaff()
  }, [fetchStaff])

  const exportData = useCallback(() => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Address', 'Created Date'],
      ...filteredStaff.map(staff => [
        staff.name || '',
        staff.email || '',
        staff.phone_number || '',
        staff.address || '',
        format(new Date(staff.created_at), 'yyyy-MM-dd')
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `staff-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredStaff])

  if (loading) {
    return (
      <Card className="shadow-lg w-full">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const StaffItem = ({ staff: staffMember }: { staff: Staff }) => (
    <div className={cn(
      "p-3 sm:p-4 rounded-xl border transition-all hover:shadow-md",
      "bg-white hover:bg-gray-50 w-full"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                {staffMember.name}
              </h3>
              <Badge variant="outline" className="text-xs w-fit">Staff</Badge>
            </div>
            
            <div className="space-y-1 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{staffMember.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{staffMember.phone_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{staffMember.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs">
                  Added {format(new Date(staffMember.created_at), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile-friendly action buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-1 ml-2">
          <EditStaffDialog staff={staffMember} onUpdated={fetchStaff} />
          <DeleteDialog
            label="Staff"
            onConfirm={async () => {
              // Security: Only delete if staff belongs to this gym
              await supabase.from("staff").delete().eq("id", staffMember.id).eq("gym_id", gymId)
              handleDeleted()
            }}
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Card className="shadow-lg w-full">
        <CardHeader className="pb-4">
          {/* Mobile-responsive header */}
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Staff Management</CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            {/* Mobile-responsive action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {!isCompact && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                    className="hidden sm:flex"
                  >
                    {viewMode === 'list' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportData}
                    className="hidden sm:flex"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <AddStaffDialog onAdded={fetchStaff} />
              {isCompact && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAll(true)}
                  className="w-full sm:w-auto"
                >
                  View All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Mobile-responsive filters */}
          {!isCompact && (
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search staff..."
                  className="pl-10 bg-gray-50 border-gray-200 w-full text-sm"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48 bg-gray-50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="date">Date Added</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Staff List */}
          <div className="space-y-2 sm:space-y-3">
            {paginatedStaff.map(staffMember => (
              <StaffItem key={staffMember.id} staff={staffMember} />
            ))}
            
            {filteredStaff.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Staff Found</h3>
                <p className="text-sm text-gray-600 mb-4 px-4">
                  {searchTerm || localSearch ? 'Try adjusting your search terms' : 'Get started by adding your first staff member'}
                </p>
                <AddStaffDialog onAdded={fetchStaff} />
              </div>
            )}
          </div>

          {/* Mobile-responsive pagination */}
          {!isCompact && totalPages > 1 && (
            <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mt-6 pt-4 border-t">
              <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredStaff.length)} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredStaff.length)} of {filteredStaff.length} staff
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="text-xs sm:text-sm"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="text-xs sm:text-sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile-responsive Show All Dialog */}
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <UserCheck className="w-5 h-5" />
              All Staff Members
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <div className="grid gap-3 sm:gap-4 p-2 sm:p-4">
              {staff.map(staffMember => (
                <StaffItem key={staffMember.id} staff={staffMember} />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}