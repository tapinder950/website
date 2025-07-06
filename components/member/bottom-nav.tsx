"use client"
import { Home, CalendarCheck2, UserCircle2, Trophy, QrCode, CreditCard } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboards/member", label: "Home", icon: Home },
  { href: "/dashboards/member/scan", label: "Scan", icon: QrCode },
  { href: "/dashboards/member/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboards/member/achievements", label: "Rewards", icon: Trophy },
  { href: "/dashboards/member/profile", label: "Profile", icon: UserCircle2 },
]

export function MemberBottomNav() {
  const pathname = usePathname()
  
  return (
    <nav className="bg-white/95 backdrop-blur-md border-t border-gray-200/50 shadow-lg">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-0 flex-1",
                isActive 
                  ? "text-green-600 bg-green-50 shadow-sm scale-105" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className={cn(
                "transition-transform duration-200",
                isActive ? "w-6 h-6 scale-110" : "w-5 h-5"
              )} />
              <span className={cn(
                "text-xs font-medium truncate transition-all duration-200",
                isActive ? "text-green-700 font-semibold scale-105" : "text-gray-600"
              )}>
                {label}
              </span>
              {isActive && (
                <div className="w-1 h-1 bg-green-600 rounded-full absolute -top-1" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MemberBottomNav