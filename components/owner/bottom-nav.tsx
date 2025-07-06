"use client"

import { Home, Users, Dumbbell, Settings, ListPlus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CreditCard } from "lucide-react"




const navItems = [
  { href: "/dashboards/owner", label: "Home", icon: Home },
  { href: "/dashboards/owner/members", label: "Members", icon: Users },
  { href: "/dashboards/owner/management", label: "Management", icon: ListPlus },
  { href: "/dashboards/owner/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/dashboards/owner/qr", label: "QR", icon: CreditCard },
  { href: "/dashboards/owner/settings", label: "Settings", icon: Settings },

  
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="flex justify-around items-center h-16">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex flex-col items-center text-xs gap-1 px-2 py-1 ${
            pathname === href
              ? "text-red-600 font-bold"
              : "text-gray-500"
          }`}
        >
          <Icon className="w-6 h-6" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
