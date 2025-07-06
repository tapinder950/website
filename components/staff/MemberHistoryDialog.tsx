"use client"
import { useState, useEffect } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useStaffGym } from "@/app/dashboards/staff/layout"

export function MemberHistoryDialog({ member }: { member: any }) {
  const { gymId } = useStaffGym()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchHistory = async () => {
    if (!gymId) return
    setLoading(true)
    const { data } = await supabase
      .from("checkins")
      .select("check_in, check_out, created_at, members!inner(gym_id)")
      .eq("member_id", member.id)
      .eq("members.gym_id", gymId)
      .order("check_in", { ascending: false })
      .limit(50)
    setHistory(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (open) fetchHistory()
    // eslint-disable-next-line
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge variant="outline" className="cursor-pointer bg-blue-50 text-blue-800 border-blue-200 ml-2">
          <Clock className="w-4 h-4 mr-1" /> History
        </Badge>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>
            {member.name} — Check-in History
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 text-xs text-gray-500 mb-2">{member.email}</div>
        {loading ? (
          <div className="py-6 text-center text-gray-400">Loading...</div>
        ) : (
          <>
            <div className="mb-3 text-base font-semibold">
              Total check-ins: <span className="text-blue-700">{history.length}</span>
            </div>
            {history.length === 0 ? (
              <div className="py-6 text-center text-gray-400">No history.</div>
            ) : (
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-2 font-semibold text-left">Date</th>
                      <th className="py-2 px-2 font-semibold text-left">Check-in</th>
                      <th className="py-2 px-2 font-semibold text-left">Check-out</th>
                      <th className="py-2 px-2 font-semibold text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => {
                      const checkin = h.check_in ? new Date(h.check_in) : null
                      const checkout = h.check_out ? new Date(h.check_out) : null
                      return (
                        <tr
                          key={i}
                          className={
                            i % 2 === 0
                              ? "bg-white hover:bg-blue-50"
                              : "bg-gray-50 hover:bg-blue-50"
                          }
                        >
                          <td className="py-1 px-2">
                            {checkin?.toLocaleDateString()}
                          </td>
                          <td className="py-1 px-2">
                            {checkin
                              ? checkin.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
                          <td className="py-1 px-2">
                            {checkout
                              ? checkout.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : (
                                <span className="text-red-600">--</span>
                              )}
                          </td>
                          <td className="py-1 px-2">
                            {checkout ? (
                              <span className="text-green-700">Checked Out</span>
                            ) : (
                              <span className="text-yellow-600">Still In</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
