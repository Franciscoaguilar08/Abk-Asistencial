/**
 * Frontend utility to interact with the backend Gemini proxy.
 * This keeps the API key secure by never exposing it to the client.
 */

export async function generateAIResponse(prompt: string, systemInstruction?: string) {
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate AI response');
    }

    const data = await response.json();
    return data.text as string;
  } catch (error) {
    console.error('AI Generation Error:', error);
    throw error;
  }
}
