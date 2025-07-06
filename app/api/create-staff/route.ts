import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NOTE: SERVICE_ROLE_KEY, NOT anon!
)

export async function POST(req: Request) {
  try {
    const { 
      email, 
      password, 
      name, 
      phone_number, 
      address, 
      gym_id 
    } = await req.json()

    if (!email || !password || !name || !gym_id) {
      return NextResponse.json({ 
        error: "Missing required fields: email, password, name, gym_id" 
      }, { status: 400 })
    }

    // 1. Create user with admin client (auto-verified)
    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-verify email
      user_metadata: {
        name,
        phone_number,
        address,
        role: "staff"
      }
    })

    if (signUpError || !userData.user) {
      return NextResponse.json({ 
        error: signUpError?.message || "Failed to create user account" 
      }, { status: 500 })
    }

    // 2. Add to staff table
    const { error: staffError } = await supabaseAdmin
      .from("staff")
      .insert([{
        user_id: userData.user.id,
        gym_id,
        name,
        email,
        phone_number,
        address,
      }])

    if (staffError) {
      // Cleanup: delete the auth user if staff creation fails
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      return NextResponse.json({ 
        error: staffError.message 
      }, { status: 500 })
    }

    // 3. Add to profiles table
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert([{ 
        id: userData.user.id, 
        role: "staff",
        name,
        email 
      }])

    if (profileError) {
      // Cleanup: delete the auth user and staff record if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      await supabaseAdmin.from("staff").delete().eq("user_id", userData.user.id)
      return NextResponse.json({ 
        error: profileError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: userData.user 
    })

  } catch (error: any) {
    console.error("Error creating staff:", error)
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 })
  }
}