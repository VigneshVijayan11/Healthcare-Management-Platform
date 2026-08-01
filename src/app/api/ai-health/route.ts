import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `You are a compassionate and knowledgeable AI Health Assistant for HMS Pro Hospital.

Your role is to help patients understand their symptoms, possible causes, home-care steps, and when to seek medical attention.

Guidelines:
- Read the patient's EXACT symptoms carefully and respond specifically to what they describe.
- Never give a one-size-fits-all generic answer — always tailor your response to the specific symptoms mentioned.
- Structure your reply as follows:

🔍 **Possible Causes:**
- List 2–4 likely conditions specifically matching the described symptoms

🛡️ **General Precautions & Home Care:**
- List practical, symptom-specific care steps

🏥 **When to See a Doctor Immediately:**
- List specific red-flag warning signs related to these symptoms

⚠️ **Disclaimer:** Always end with: "This is general information only and NOT a substitute for professional medical advice. Please consult a licensed physician for proper diagnosis and treatment."

Keep responses clear, empathetic, and concise. Do NOT definitively diagnose. Maintain context across the conversation.`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function getFallbackReply(message: string): string {
  const lower = message.toLowerCase()
  
  if (lower.includes('fever') || lower.includes('temperature')) {
    return `🔍 **Possible Causes:**\n- Viral infection (flu, cold, COVID-19)\n- Bacterial infection\n- Heat exhaustion\n- Inflammatory conditions\n\n🛡️ **General Precautions & Home Care:**\n- Rest and stay well hydrated (water, clear soups, electrolytes)\n- Take paracetamol/acetaminophen as directed to reduce fever\n- Use a cool, damp cloth on your forehead\n- Monitor temperature every few hours\n\n🏥 **When to See a Doctor Immediately:**\n- Fever above 103°F (39.4°C) that doesn't reduce with medication\n- Fever lasting more than 3 days\n- Difficulty breathing, severe headache, or skin rash\n- Confusion or loss of consciousness\n\n⚠️ This is general information only and NOT a substitute for professional medical advice. Please consult a licensed physician for proper diagnosis and treatment.`
  }
  
  if (lower.includes('headache') || lower.includes('head pain')) {
    return `🔍 **Possible Causes:**\n- Tension headache (stress, poor posture)\n- Dehydration or missed meals\n- Migraine\n- Eye strain from screens\n- Sinusitis\n\n🛡️ **General Precautions & Home Care:**\n- Drink 2–3 glasses of water immediately\n- Rest in a quiet, dark room\n- Apply a cold/warm compress to your forehead or neck\n- Avoid bright screens for 30 minutes\n\n🏥 **When to See a Doctor Immediately:**\n- Sudden, severe "thunderclap" headache\n- Headache with fever, stiff neck, or vomiting\n- Headache following a head injury\n- Vision changes or confusion alongside headache\n\n⚠️ This is general information only and NOT a substitute for professional medical advice. Please consult a licensed physician for proper diagnosis and treatment.`
  }
  
  if (lower.includes('cough') || lower.includes('cold') || lower.includes('throat')) {
    return `🔍 **Possible Causes:**\n- Common cold or viral upper respiratory infection\n- Allergic rhinitis\n- Throat irritation from dust or dry air\n- Early-stage flu\n\n🛡️ **General Precautions & Home Care:**\n- Gargle with warm salt water 2–3 times a day\n- Drink warm liquids (honey-ginger tea, soups)\n- Use a humidifier if air is dry\n- Rest your voice and avoid cold drinks\n\n🏥 **When to See a Doctor Immediately:**\n- Difficulty swallowing or breathing\n- Coughing up blood\n- High fever with severe throat pain\n- Symptoms lasting more than 10 days\n\n⚠️ This is general information only and NOT a substitute for professional medical advice. Please consult a licensed physician for proper diagnosis and treatment.`
  }

  // Generic fallback only when we truly can't infer the symptom
  return `I understand you're asking about: "${message}"\n\nCould you please describe your symptoms in more detail? For example:\n- What exactly are you experiencing?\n- How long have you had these symptoms?\n- Are they getting better or worse?\n\nThe more detail you provide, the better I can tailor my guidance for you.\n\n⚠️ This is general information only and NOT a substitute for professional medical advice. Please consult a licensed physician for proper diagnosis and treatment.`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, history } = body as { message: string; history?: ChatMessage[] }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey || apiKey === 'your-openai-api-key' || apiKey.startsWith('sk-placeholder')) {
      return NextResponse.json({ reply: getFallbackReply(message) })
    }

    try {
      const openai = new OpenAI({ apiKey })

      // Build the full conversation: system + history + new user message
      const conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        // Include previous turns (max last 10 to stay within token limits)
        ...(history ?? []).slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ]

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: conversationHistory,
        max_tokens: 700,
        temperature: 0.7,
      })

      const reply = completion.choices[0]?.message?.content || getFallbackReply(message)
      return NextResponse.json({ reply })
    } catch (openAiError: any) {
      console.warn('OpenAI API call failed, using symptom-aware fallback:', openAiError?.message || openAiError)
      return NextResponse.json({ reply: getFallbackReply(message) })
    }
  } catch (error: any) {
    console.error('AI Health handler error:', error)
    return NextResponse.json({ error: 'Service temporarily unavailable.' }, { status: 500 })
  }
}