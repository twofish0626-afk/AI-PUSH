const OPENAI_API_KEY = process.env.AI_API_KEY || '';

export interface AIConfig {
  apiBaseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export async function callAI(
  config: AIConfig,
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch(`${config.apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
