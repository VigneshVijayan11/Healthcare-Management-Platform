'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const data = {
    email: (formData.get('email') as string).trim(),
    password: formData.get('password') as string,
  }

  console.log("Attempting login for:", data.email)
  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error("Login error:", error)
    return { error: error.message || JSON.stringify(error) || "Login failed" }
  }

  console.log("Login successful!")
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const email    = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role     = formData.get('role') as string

  console.log("Attempting signup for:", email, "| role:", role, "| name:", fullName)

  const { data: signupData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  })

  if (error) {
    console.error("Signup error:", error)
    return { error: error.message || JSON.stringify(error) || "Signup failed" }
  }

  console.log("Signup response — user id:", signupData.user?.id)
  console.log("Signup response — identities:", JSON.stringify(signupData.user?.identities))
  console.log("Signup response — email_confirmed_at:", signupData.user?.email_confirmed_at)
  console.log("Signup response — session:", signupData.session ? "EXISTS" : "NULL (email confirmation required)")

  // If identities array is empty, the email already exists but is unconfirmed
  if (signupData.user && signupData.user.identities?.length === 0) {
    return { error: "An account with this email already exists. Please check your email to confirm it, or try logging in." }
  }

  // If no session, email confirmation is required
  if (!signupData.session) {
    return {
      error: null,
      info: "Account created! Please check your email and click the confirmation link before logging in."
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
