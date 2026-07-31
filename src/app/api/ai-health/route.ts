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

function getFallbackReply(message: string): string {
  return `I understand you are asking about: "${message}"\n\n🔍 **Possible Causes:**\n- Common viral infection or mild illness\n- Fatigue, stress, or dehydration\n- Seasonal allergies or ambient environmental factors\n\n🛡️ **General Precautions:**\n- Rest adequately and keep yourself well hydrated\n- Take over-the-counter remedies if appropriate\n- Monitor your symptoms closely over the next 24-48 hours\n- Avoid strenuous physical exertion\n\n🏥 **When to Consult a Doctor:**\n- If symptoms persist for more than 3 days\n- If you develop high fever, severe pain, or difficulty breathing\n- If symptoms rapidly worsen\n\n⚠️ Remember, this is general information only and NOT a substitute for professional medical advice. Please consult a licensed physician for proper diagnosis and treatment.`
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY

    // Check for missing/placeholder key
    if (!apiKey || apiKey === 'your-openai-api-key') {
      return NextResponse.json({ reply: getFallbackReply(message) })
    }

    try {
      const openai = new OpenAI({ apiKey })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 600,
      })

      const reply = completion.choices[0]?.message?.content || getFallbackReply(message)
      return NextResponse.json({ reply })
    } catch (openAiError: any) {
      console.warn('OpenAI API call failed, using fallback health assistant response:', openAiError?.message || openAiError)
      // Fallback response if quota exceeded (429) or API unavailable
      return NextResponse.json({ reply: getFallbackReply(message) })
    }
  } catch (error: any) {
    console.error('AI Health handler error:', error)
    return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 500 })
  }
}