"use client"
import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StaffCard from "@/components/owner/StaffCard"
import MemberCard from "@/components/owner/MemberCard"
import { 
  Users, 
  UserCheck, 
  Search, 
  RefreshCw,
  TrendingUp,
  Activity,
  BarChart3,
  Menu,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function ManagementPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [globalSearch, setGlobalSearch] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Mobile-First Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                Management Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
                Manage your staff and members efficiently
              </p>
            </div>
            
            {/* Mobile action buttons */}
            <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:space-x-3">
              {/* Search - Full width on mobile */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search globally..."
                  className="pl-10 w-full bg-white border-gray-200 text-sm"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
              </div>
              
              {/* Refresh button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="sm:hidden">Refresh Data</span>
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile-Responsive Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Mobile-friendly tabs */}
          <div className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-white shadow-sm">
              <TabsTrigger 
                value="overview" 
                className="flex flex-col items-center gap-1 py-2 px-2 text-xs sm:text-sm sm:flex-row sm:gap-2 sm:py-2 sm:px-4"
              >
                <BarChart3 className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                value="staff" 
                className="flex flex-col items-center gap-1 py-2 px-2 text-xs sm:text-sm sm:flex-row sm:gap-2 sm:py-2 sm:px-4"
              >
                <UserCheck className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Staff</span>
                <span className="sm:hidden">Staff</span>
              </TabsTrigger>
              <TabsTrigger 
                value="members" 
                className="flex flex-col items-center gap-1 py-2 px-2 text-xs sm:text-sm sm:flex-row sm:gap-2 sm:py-2 sm:px-4"
              >
                <Users className="h-4 w-4 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Members</span>
                <span className="sm:hidden">Members</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="w-full">
            {/* Overview Tab - Mobile Responsive Grid */}
            <TabsContent value="overview" className="mt-4 sm:mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="w-full">
                  <StaffCard 
                    refresh={refreshKey} 
                    searchTerm={globalSearch}
                    isCompact={true}
                  />
                </div>
                <div className="w-full">
                  <MemberCard 
                    refresh={refreshKey} 
                    searchTerm={globalSearch}
                    isCompact={true}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Staff Tab - Full Width */}
            <TabsContent value="staff" className="mt-4 sm:mt-6">
              <div className="w-full">
                <StaffCard 
                  refresh={refreshKey} 
                  searchTerm={globalSearch}
                  isCompact={false}
                />
              </div>
            </TabsContent>

            {/* Members Tab - Full Width */}
            <TabsContent value="members" className="mt-4 sm:mt-6">
              <div className="w-full">
                <MemberCard 
                  refresh={refreshKey} 
                  searchTerm={globalSearch}
                  isCompact={false}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}