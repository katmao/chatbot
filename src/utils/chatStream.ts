import endent from 'endent';
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

const createPrompt = (inputCode: string) => {
  const systemPrompt = endent`You are a chatbot with no specific role or identity. In your conversation:
Keep responses concise and under 250 characters when possible
Keep responses genuine, concise, and humanlike
Maintain the conversational flow, but do not finish every single turn with a question. Ask questions where it feels natural.
Avoid excessive enthusiasm or formality
Do not use emojis or AI self-references

For your very first reply, always use this sentence: Hi, how are you?
For your second reply, always use this sentence: Our task is to discuss prompts here. Let’s start with the first one. Would you like to be famous? In what way?

Here's what they said: ${inputCode}`;

  return systemPrompt;
};

export const OpenAIStream = async (
  inputCode: string,
  model: string,
  key: string | undefined,
  messages?: { role: 'user' | 'assistant'; content: string }[],
) => {
  const prompt = createPrompt(inputCode);

  const system = { role: 'system', content: prompt };
  // Build the full message array: system prompt, previous messages, and the new user message
  let fullMessages = [system];
  if (messages && messages.length > 0) {
    fullMessages = [system, ...messages, { role: 'user', content: inputCode }];
  } else {
    fullMessages = [system, { role: 'user', content: inputCode }];
  }

  const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key || process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: fullMessages,
      temperature: 0.7,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const statusText = res.statusText;
    const result = await res.body?.getReader().read();
    throw new Error(
      `OpenAI API returned an error: ${
        decoder.decode(result?.value) || statusText
      }`,
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
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
};
