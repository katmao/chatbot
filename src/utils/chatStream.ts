import endent from 'endent';
const { createParser } = require('eventsource-parser');

type ChatGPTAgent = 'user' | 'system' | 'assistant';

interface ChatGPTMessage {
  role: ChatGPTAgent;
  content: string;
}

// Accept messages as a parameter
const createPrompt = (messages: ChatGPTMessage[]) => {
  // Count assistant replies so far
  const assistantCount = messages.filter(m => m.role === 'assistant').length;

  let systemPrompt = endent`
You are a chatbot with no specific role or identity. In your conversation:
- Keep responses concise and under 250 characters when possible
- Use natural contractions and casual language
- Keep responses genuine and humanlike
- Maintain the conversational flow, but do not finish every single turn with a question. Ask questions where it feels natural.
- Avoid excessive enthusiasm or formality
- No emojis or AI self-references
`;

  if (assistantCount === 0) {
    systemPrompt += '\n\nCRITICAL INSTRUCTION: For your very first reply, you MUST respond with EXACTLY these words and nothing else: "Hi, how are you?"';
  } else if (assistantCount === 1) {
    systemPrompt += '\n\nCRITICAL INSTRUCTION: For your second reply, you MUST respond with EXACTLY these words and nothing else: "Our task is to discuss prompts here. Let\'s start with the first one. Would you like to be famous? In what way?"';
  }

  return systemPrompt;
};

// Accept full message history
export async function OpenAIStream(messages: ChatGPTMessage[]) {
  // Count assistant replies so far
  const assistantCount = messages.filter(m => m.role === 'assistant').length;
  
  // Force exact responses for first and second replies
  if (assistantCount === 0) {
    // Return exact first reply
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const text = "Hi, how are you?";
        controller.enqueue(encoder.encode(text));
        controller.close();
      }
    });
    return stream;
  } else if (assistantCount === 1) {
    // Return exact second reply
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const text = "Our task is to discuss prompts here. Let's start with the first one. Would you like to be famous? In what way?";
        controller.enqueue(encoder.encode(text));
        controller.close();
      }
    });
    return stream;
  }

  // For subsequent replies, use normal OpenAI API
  const systemPrompt = createPrompt(messages);
  const systemMessage = { role: 'system', content: systemPrompt };
  // Remove any previous system messages from history
  const filteredMessages = messages.filter(m => m.role !== 'system');
  const fullMessages = [systemMessage, ...filteredMessages];

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (res.status !== 200) {
    throw new Error('OpenAI API returned an error');
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: { type: string; data?: string }) => {
        if (event.type === 'event' && event.data) {
          const data = event.data;
          if (data === '[DONE]') {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
}
