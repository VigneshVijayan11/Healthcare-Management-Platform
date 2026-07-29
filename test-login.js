import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://oeojmikcxjyrlemlqvhm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lb2ptaWtjeGp5cmxlbWxxdmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNDc4MjAsImV4cCI6MjEwMDgyMzgyMH0.IJXrBVnutpolOD4QuETslwJrL-FUGViYsOsM8iPn8xw'
)

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  })
  console.log('Login result:', data, error)
}
testLogin()
