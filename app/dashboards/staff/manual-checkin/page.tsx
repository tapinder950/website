"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useStaffGym } from "../layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { UserCircle2, Check } from "lucide-react"
import { MemberHistoryDialog } from "@/components/staff/MemberHistoryDialog"

export default function StaffManualCheckinPage() {
  const { gymId } = useStaffGym()
  const [search, setSearch] = useState("")
  const [members, setMembers] = useState<any[]>([])
  const [status, setStatus] = useState<{ [key: string]: { checkedIn: boolean, checkinTime?: string, checkinId?: string } }>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch members and today's check-in status
  useEffect(() => {
    const fetchMembersAndStatus = async () => {
      if (!gymId) return
      setLoading(true)
      const { data: memberList } = await supabase
        .from("members")
        .select("id, name, email")
        .eq("gym_id", gymId)
      setMembers(memberList || [])
      const today = new Date().toISOString().split("T")[0]
      const { data: checkins } = await supabase
        .from("checkins")
        .select("id, member_id, check_in, members!inner(gym_id)")
        .eq("members.gym_id", gymId)
        .is("check_out", null)
        .gte("check_in", today)
      const statusMap: { [key: string]: { checkedIn: boolean, checkinTime?: string, checkinId?: string } } = {}
      for (const m of memberList || []) {
        const ci = checkins?.find(c => c.member_id === m.id)
        if (ci) {
          statusMap[m.id] = {
            checkedIn: true,
            checkinTime: ci.check_in,
            checkinId: ci.id,
          }
        } else {
          statusMap[m.id] = { checkedIn: false }
        }
      }
      setStatus(statusMap)
      setLoading(false)
    }
    fetchMembersAndStatus()
  }, [gymId])

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCheckInOut = async (member: any) => {
    if (!gymId) return
    setActionLoading(member.id)
    if (status[member.id]?.checkedIn && status[member.id]?.checkinId) {
      const now = new Date().toISOString()
      // Verify the check-in belongs to a member from this gym before updating
      const { error } = await supabase
        .from("checkins")
        .update({ check_out: now })
        .eq("id", status[member.id].checkinId)
        .eq("member_id", member.id) // Additional security check
      if (!error) {
        toast.success(`${member.name} checked out!`)
        setStatus(s => ({
          ...s,
          [member.id]: { checkedIn: false }
        }))
      } else {
        toast.error("Checkout failed.")
      }
    } else {
      const now = new Date().toISOString()
      const { data, error } = await supabase.from("checkins").insert([
        {
          member_id: member.id,
          check_in: now,
          check_out: null,
          created_at: now,
        },
      ]).select().single()
      if (!error && data) {
        toast.success(`${member.name} checked in!`)
        setStatus(s => ({
          ...s,
          [member.id]: { checkedIn: true, checkinTime: now, checkinId: data.id }
        }))
      } else {
        toast.error("Check-in failed.")
      }
    }
    setActionLoading(null)
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Manual Check-in / Check-out</h2>
      <Input
        placeholder="Search by name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />
      {loading ? (
        <div className="py-8 text-center text-gray-400">Loading members...</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-gray-400">No members found.</div>
          )}
          {filtered.map((member) => (
            <Card key={member.id} className="w-full shadow-sm">
              <CardContent className="flex items-center gap-3 py-3 px-2 sm:px-6">
                <div className="flex-shrink-0">
                  <UserCircle2 className="w-10 h-10 text-gray-300" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-semibold truncate">{member.name}</div>
                  <div className="text-xs text-gray-400 truncate">{member.email}</div>
                  <div className="flex items-center gap-2">
                    {status[member.id]?.checkedIn ? (
                      <Badge className="mt-1 bg-green-100 text-green-700 border-green-300">
                        <Check className="w-3 h-3 mr-1" />
                        Checked in {status[member.id].checkinTime && (
                          <span className="ml-1">
                            {new Date(status[member.id].checkinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </Badge>
                    ) : (
                      <Badge className="mt-1 bg-gray-100 text-gray-500 border-gray-300">
                        Not checked in
                      </Badge>
                    )}
                    <MemberHistoryDialog member={member} />
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    variant={status[member.id]?.checkedIn ? "destructive" : "default"}
                    onClick={() => handleCheckInOut(member)}
                    disabled={!!actionLoading}
                    size="sm"
                  >
                    {actionLoading === member.id
                      ? "Processing..."
                      : status[member.id]?.checkedIn
                      ? "Check-out"
                      : "Check-in"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
