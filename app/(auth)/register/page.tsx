"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("member")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Create user in Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message || "Registration failed")
      setLoading(false)
      return
    }

    // Add to profiles table with role (use upsert to avoid duplicate key errors)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert([{ 
        id: data.user.id, 
        role,
        email,
        name: email.split("@")[0]
      }])

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // Registration successful
    router.push("/login")
  }

  return (
    <form onSubmit={handleRegister} className="max-w-md mx-auto space-y-4 mt-16 p-4 border rounded-xl shadow bg-white">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      <Input
        placeholder="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <Input
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <select
        className="w-full border p-2 rounded"
        value={role}
        onChange={e => setRole(e.target.value)}
      >
        <option value="member">Member</option>
        <option value="staff">Staff</option>
        <option value="gym_owner">Gym Owner</option>
        {/* You can add "trainer" and "super_admin" here if needed */}
      </select>
      <Button type="submit" disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </Button>
      {error && <div className="text-red-600">{error}</div>}
    </form>
  )
}
