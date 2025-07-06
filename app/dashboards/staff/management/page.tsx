"use client"
import { useState } from "react"
import StaffMemberCard from "@/components/staff/StaffMemberCard"

export default function StaffManagementPage() {
  const [refresh, setRefresh] = useState(0)
  return (
    <div className="space-y-6">
      <StaffMemberCard refresh={refresh} />
    </div>
  )
}
