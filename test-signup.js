require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Signing up test user...")
  const res = await supabase.auth.signUp({
    email: 'test_signup_123@example.com',
    password: 'password123',
    options: { data: { full_name: 'Test User', role: 'patient' } }
  })
  
  if (res.error) {
    console.error("SIGNUP ERROR:", res.error)
    console.error("Message:", res.error.message)
    console.error("Name:", res.error.name)
  } else {
    console.log("SIGNUP SUCCESS:", res.data.user.id)
  }
}
run()
