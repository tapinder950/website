"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, PieChart } from "lucide-react"
import dynamic from "next/dynamic"
import { useStaffGym } from "../layout"

const MembersChart = dynamic(() => import("@/components/owner/MembersChart"), { ssr: false })

export default function StaffMembersPage() {
  const { gymId } = useStaffGym()
  const [members, setMembers] = useState<any[]>([])

  useEffect(() => {
    if (gymId) {
      fetchMembers()
    }
  }, [gymId])

  const fetchMembers = async () => {
    if (!gymId) return
    const { data } = await supabase
      .from("members")
      .select("*")
      .eq("gym_id", gymId)
      .order("created_at", { ascending: false })
    setMembers(data || [])
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Members count */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-2">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold">{members.length}</span>
            <span className="text-gray-500 text-sm">Total Members</span>
          </CardHeader>
        </Card>
        {/* Growth/Chart */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-2">
            <PieChart className="w-8 h-8 text-red-500" />
            <span className="text-gray-500 text-sm">Membership Growth</span>
          </CardHeader>
          <CardContent>
            <MembersChart members={members} />
          </CardContent>
        </Card>
      </div>
      {/* Member Details Table */}
      <Card>
        <CardHeader className="font-bold text-lg">All Members</CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map(m => (
                  <TableRow key={m.id}>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{m.phone_number}</TableCell>
                    <TableCell>{m.address}</TableCell>
                    <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">No members found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
