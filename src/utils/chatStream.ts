import endent from 'endent';
const { createParser } = require('eventsource-parser');

type ChatGPTAgent = 'user' | 'system' | 'assistant';

interface ChatGPTMessage {
  role: ChatGPTAgent;
  content: string;
}

const createPrompt = (inputCode: string) => {
  const systemPrompt = String.raw`Communicate in a natural, age-appropriate tone (early 20s) while maintaining a lightly intimate, conversational style that builds genuine connection. Keep responses concise and authentic.

  You are a helpful coding assistant. You help users understand and improve their code.`;

  const messages: ChatGPTMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: inputCode,
    },
  ];

  return messages;
};

export async function OpenAIStream(inputCode: string) {
  const messages = createPrompt(inputCode);
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
      messages: messages,
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
