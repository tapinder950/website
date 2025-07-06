"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export default function MembersChart({ members }: { members: any[] }) {
  // Prepare monthly data
  const months: Record<string, number> = {}
  members.forEach(m => {
    const dt = new Date(m.created_at)
    const month = `${dt.getFullYear()}-${(dt.getMonth() + 1).toString().padStart(2, "0")}`
    months[month] = (months[month] || 0) + 1
  })
  const data = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))

  if (data.length === 0) return <div className="text-sm text-gray-400">No data yet.</div>
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" />
      </BarChart>
    </ResponsiveContainer>
  )
}
