"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { LogOut, UserCircle2 } from "lucide-react"

export default function OwnerHeader() {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user?.id) return setLoading(false)
      // Fetch name from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.user.id)
        .single()
      if (data?.name) setName(data.name)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Redirect to login page (or homepage)
    window.location.href = "/login"
  }

  if (loading) return null

  return (
    <header className="w-full flex items-center justify-between bg-white shadow px-4 py-4 rounded-xl mb-4">
      <div className="flex items-center gap-3">
        <UserCircle2 className="w-10 h-10 text-blue-300" />
        <div>
          <div className="text-xl font-bold text-gray-800">
            Welcome, {name ? name : "Owner"}!
          </div>
          <div className="text-sm text-gray-500">Gym Owner Dashboard</div>
        </div>
      </div>
      <Button onClick={handleLogout} variant="destructive" size="sm" className="flex items-center gap-1">
        <LogOut className="w-4 h-4" />
        Log out
      </Button>
    </header>
  )
}
