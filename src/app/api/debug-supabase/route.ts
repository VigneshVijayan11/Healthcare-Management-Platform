import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing env vars', url: !!url, key: !!key })
  }

  try {
    // Test 1: Ping the Supabase REST API
    const pingRes = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    const pingStatus = pingRes.status

    // Test 2: Check auth settings (does signup endpoint respond?)
    const authRes = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
    })
    const authStatus = authRes.status
    const authBody = await authRes.json().catch(() => null)

    return NextResponse.json({
      ok: true,
      supabaseUrl: url,
      restApiStatus: pingStatus,
      authApiStatus: authStatus,
      emailConfirmRequired: authBody?.external?.email?.enabled,
      signupDisabled: authBody?.disable_signup,
      autoconfirm: authBody?.autoconfirm,  // true = no email confirmation needed
      rawAuthSettings: authBody,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack })
  }
}
