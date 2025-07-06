"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import MemberSubscriptionPanel from "@/components/owner/MemberSubscriptionPanel"
import { Input } from "@/components/ui/input"
import { UserCircle2 } from "lucide-react"
import { useStaffGym } from "../layout"

export default function StaffSubscriptionsPage() {
  const { gymId } = useStaffGym()
  const [members, setMembers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<any>(null)

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
    setMembers(data || [])
  }

  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-7xl mx-auto py-8">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-white rounded-2xl shadow-md p-4 h-fit md:sticky top-24">
        <div className="mb-4 font-semibold text-lg tracking-tight">Members</div>
        <Input
          placeholder="Search..."
          className="mb-3"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filtered.map(m => (
            <li
              key={m.id}
              onClick={() => setSelected(m)}
              className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors cursor-pointer ${
                selected?.id === m.id
                  ? "bg-blue-50 font-semibold border border-blue-300"
                  : "hover:bg-gray-50"
              }`}
            >
              <UserCircle2 className="w-7 h-7 text-gray-300" />
              <div>
                <div className="text-base">{m.name}</div>
                <div className="text-xs text-gray-400">{m.email}</div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-6 text-center text-gray-400">No members found.</li>
          )}
        </ul>
      </aside>
      {/* Main Panel */}
      <main className="flex-1">
        {selected ? (
          <MemberSubscriptionPanel member={selected} onUpdate={fetchMembers} />
        ) : (
          <div className="h-72 flex items-center justify-center text-gray-400">
            <span>Select a member to see details</span>
          </div>
        )}
      </main>
    </div>
  )
}
