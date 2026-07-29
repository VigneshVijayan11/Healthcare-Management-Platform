import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a helpful AI Health Assistant for a hospital. 
When a patient describes symptoms, respond in this structured format:

🔍 **Possible Causes:**
- List 2-4 possible conditions based on the symptoms

🛡️ **General Precautions:**
- List practical home-care steps and precautions

🏥 **When to Consult a Doctor:**
- Describe warning signs that require immediate medical attention

⚠️ DISCLAIMER: Always end with: "Remember, this is general information only and NOT a substitute for professional medical advice. Please consult a licensed physician for proper diagnosis and treatment."

Keep responses clear, concise, and empathetic. Do NOT diagnose conditions definitively.`

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY

    // Check for missing/placeholder key BEFORE creating the OpenAI client
    if (!apiKey || apiKey === 'your-openai-api-key') {
      // Fallback mock response if no API key is configured
      return NextResponse.json({
        reply: `I understand you're experiencing: "${message}"\n\n🔍 **Possible Causes:**\n- Common cold or viral infection\n- Fatigue or dehydration\n- Seasonal allergies\n\n🛡️ **General Precautions:**\n- Rest and stay hydrated\n- Take over-the-counter medication if needed\n- Monitor your temperature\n- Avoid strenuous activity\n\n🏥 **When to Consult a Doctor:**\n- If symptoms persist for more than 3 days\n- If you have a fever above 103°F (39.4°C)\n- If you experience difficulty breathing\n- If symptoms worsen rapidly\n\n⚠️ Remember, this is general information only and NOT a substitute for professional medical advice. Please consult a licensed physician for proper diagnosis and treatment.`
      })
    }

    // Only create the client once we know a real key exists
    const openai = new OpenAI({ apiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      max_tokens: 600,
    })

    const reply = completion.choices[0]?.message?.content || 'I could not process your request. Please try again.'
    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('AI Health error:', error)
    return NextResponse.json({ error: 'AI service temporarily unavailable.' }, { status: 500 })
  }
}