"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { Pencil } from "lucide-react"

export default function StaffList({ refresh }: { refresh: number }) {
  const [staff, setStaff] = useState<any[]>([])
  const [allOpen, setAllOpen] = useState(false)

  useEffect(() => {
    fetchStaff()
    // eslint-disable-next-line
  }, [refresh])

  const fetchStaff = async () => {
    const { data } = await supabase.from("staff").select("*").order("created_at", { ascending: false })
    setStaff(data || [])
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold text-lg">Staff</div>
        <Dialog open={allOpen} onOpenChange={setAllOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">Show All</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>All Staff</DialogTitle>
            </DialogHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left">Name</th>
                    <th className="py-2 px-3 text-left">Email</th>
                    <th className="py-2 px-3 text-left">Phone</th>
                    <th className="py-2 px-3 text-left">Address</th>
                    <th className="py-2 px-3">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">{s.name}</td>
                      <td className="py-2 px-3">{s.email}</td>
                      <td className="py-2 px-3">{s.phone_number}</td>
                      <td className="py-2 px-3">{s.address}</td>
                      <td className="py-2 px-3 text-center">
                      </td>
                    </tr>
                  ))}
                  {staff.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-gray-400">No staff found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ul>
        {staff.slice(0, 3).map(s => (
          <li key={s.id} className="flex flex-col border-b py-1 last:border-b-0">
            <span className="font-medium">{s.name}</span>
            <span className="text-xs text-gray-500">{s.email} &bull; {s.phone_number}</span>
          </li>
        ))}
      </ul>
      {staff.length === 0 && <div className="text-sm mt-2">No staff yet.</div>}
    </div>
  )
}
