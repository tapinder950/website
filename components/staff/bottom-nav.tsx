"use client"

import { Home, Users, CheckSquare, ListChecks, Settings, CreditCard, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

const navItems = [
  { href: "/dashboards/staff", label: "Home", icon: Home },
  { href: "/dashboards/staff/members", label: "Members", icon: Users },
  { href: "/dashboards/staff/manual-checkin", label: "Check-in", icon: CheckSquare },
  { href: "/dashboards/staff/management", label: "Management", icon: ListChecks },
  { href: "/dashboards/staff/subscriptions", label: "Subs", icon: CreditCard },
  { href: "/dashboards/staff/settings", label: "Settings", icon: Settings },
]

export function StaffBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="flex justify-around items-center h-16 bg-white border-t shadow">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-col items-center text-xs gap-1 px-2 py-1 ${
            pathname === href ? "text-red-600 font-bold" : "text-gray-500"
          }`}
        >
          <Icon className="w-6 h-6" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
