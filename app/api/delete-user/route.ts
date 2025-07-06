import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NOTE: SERVICE_ROLE_KEY, NOT anon!
)

export async function POST(req: Request) {
  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: "No user_id" }, { status: 400 })
  // Delete from auth.users
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
