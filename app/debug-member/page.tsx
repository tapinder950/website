"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export default function DebugMemberPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function debug() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log("1. Auth User:", user, "Error:", userError)

        if (!user) {
          setData({ error: "No authenticated user" })
          setLoading(false)
          return
        }

        // Check if user exists in auth.users table
        const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(user.id)
        console.log("2. Admin User Check:", authUser, "Error:", authUserError)

        // Check profiles table
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        
        console.log("3. Profile:", profile, "Error:", profileError)

        // Check all members table
        const { data: allMembers, error: allMembersError } = await supabase
          .from("members")
          .select("*")
        
        console.log("4. All Members:", allMembers, "Error:", allMembersError)

        // Check member record for this user
        const { data: member, error: memberError } = await supabase
          .from("members")
          .select("*")
          .eq("user_id", user.id)
          .single()
        
        console.log("5. Specific Member:", member, "Error:", memberError)

        // Check if member exists with different query
        const { data: memberExists, error: memberExistsError } = await supabase
          .from("members")
          .select("*")
          .eq("user_id", user.id)
        
        console.log("6. Member Exists Check:", memberExists, "Error:", memberExistsError)

        // Check gyms table
        const { data: gyms, error: gymsError } = await supabase
          .from("gyms")
          .select("*")
        
        console.log("7. All Gyms:", gyms, "Error:", gymsError)

        setData({
          user,
          profile,
          member,
          memberExists,
          allMembers,
          gyms,
          errors: {
            user: userError,
            profile: profileError,
            member: memberError,
            memberExists: memberExistsError,
            allMembers: allMembersError,
            gyms: gymsError
          }
        })
      } catch (error) {
        console.error("Debug error:", error)
        setData({ error: error.message })
      }
      setLoading(false)
    }

    debug()
  }, [])

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Loading debug data...</h1>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Member Debug Information</h1>
      
      <div className="grid gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-bold text-lg mb-2">Summary</h2>
          <ul className="text-sm space-y-1">
            <li>User ID: {data?.user?.id || "Not found"}</li>
            <li>Profile exists: {data?.profile ? "Yes" : "No"}</li>
            <li>Member record exists: {data?.member ? "Yes" : "No"}</li>
            <li>Total members in DB: {data?.allMembers?.length || 0}</li>
            <li>Total gyms in DB: {data?.gyms?.length || 0}</li>
          </ul>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-bold text-lg mb-2">Full Debug Data</h2>
          <pre className="text-xs overflow-auto bg-white p-3 rounded border max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        {data?.errors && Object.values(data.errors).some(error => error) && (
          <div className="bg-red-50 p-4 rounded-lg">
            <h2 className="font-bold text-lg mb-2 text-red-800">Errors Found</h2>
            <pre className="text-xs overflow-auto bg-white p-3 rounded border max-h-48 text-red-600">
              {JSON.stringify(data.errors, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}