const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testAppts() {
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: 'doctor-1785510814025@example.com',
    password: 'password123'
  });

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, patient_id, doctor_id, date, time_slot, status, token_number,
      patients ( id, users ( full_name, email ) ),
      doctors ( id, specialization, users ( full_name ) )
    `);

  console.log('Appts count:', data ? data.length : 0);
  console.log('Error:', error);
  if (data && data.length > 0) {
    console.log('Sample appt:', JSON.stringify(data[0], null, 2));
  }

  // Also query users table directly to see if patient_id and doctor_id reference users.id
  const { data: users } = await supabase.from('users').select('id, full_name, email, role');
  console.log('Users list:', users);
}

testAppts();
