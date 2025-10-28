import endent from 'endent';
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// 7 prompts in order
const PROMPTS = [
  'Would you like to be famous? In what way?',
  'What would constitute a "perfect" day for you?',
  'If you were able to live to the age of 90 and retain either the mind or body of a 30-year-old for the last 60 years of your life, which would you want?',
  'If you could wake up tomorrow having gained any one quality or ability, what would it be?',
  'For what in your life do you feel most grateful?',
  'If you could change anything about the way you were raised, what would it be?',
  "Is there something that you've dreamed of doing for a long time? Why haven't you done it?",
];

const FIRST_AI_GREETING = 'Hi, how are you?';
const FIRST_PROMPT_INTRO =
  "Great! Our task is to discuss different topics today. Let's start with the first one. Would you like to be famous? In what way?";
const MOVE_ON_QUESTION =
  'Would you like to share more about this topic or should we move on to the next?';

const normalizeWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim();

const startsWithAny = (text: string, prefixes: string[]) =>
  prefixes.some(prefix => text.startsWith(prefix));

const isPromptIntroduction = (content: string, promptIndex: number) => {
  const normalized = normalizeWhitespace(content);
  const prompt = normalizeWhitespace(PROMPTS[promptIndex]);
  if (!normalized.toLowerCase().endsWith(prompt.toLowerCase())) {
    return false;
  }

  if (promptIndex === 0) {
    return normalized === normalizeWhitespace(FIRST_PROMPT_INTRO);
  }

  const lowered = normalized.toLowerCase();
  return startsWithAny(lowered, [
    'great!',
    "let's move on to the next topic.",
  ]);
};

const getPromptProgress = (messages: ChatMessage[] = []) => {
  let currentPromptIndex = 0;
  let highestPromptIndex = -1;
  let lastIntroIndex = -1;

  messages.forEach((message, index) => {
    if (message.role !== 'assistant' || !message.content) return;
    for (let promptIndex = 0; promptIndex < PROMPTS.length; promptIndex++) {
      if (isPromptIntroduction(message.content, promptIndex)) {
        const isNewerPrompt =
          promptIndex > highestPromptIndex ||
          (promptIndex === highestPromptIndex && index > lastIntroIndex);

        if (isNewerPrompt) {
          highestPromptIndex = promptIndex;
          currentPromptIndex = promptIndex;
          lastIntroIndex = index;
        }
        break;
      }
    }
  });

  if (highestPromptIndex === -1) {
    // No prompt has been introduced yet – default to the first prompt.
    currentPromptIndex = 0;
  }

  let assistantSinceIntro = 0;
  let userSinceIntro = 0;
  let moveOnQuestionAsked = false;

  if (lastIntroIndex !== -1) {
    for (let i = lastIntroIndex + 1; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg.content) continue;

      if (msg.role === 'assistant') {
        if (
          normalizeWhitespace(msg.content) === normalizeWhitespace(MOVE_ON_QUESTION)
        ) {
          moveOnQuestionAsked = true;
        }
        assistantSinceIntro += 1;
      } else {
        userSinceIntro += 1;
      }
    }
  }

  const assistantTurnsIncludingIntro =
    (lastIntroIndex !== -1 ? 1 : 0) + assistantSinceIntro;
  const turnsInCurrentPrompt =
    lastIntroIndex === -1 ? 0 : Math.max(0, assistantTurnsIncludingIntro - 1);

  return {
    currentPromptIndex,
    turnsInCurrentPrompt,
    assistantTurnsIncludingIntro,
    userSinceIntro,
    moveOnQuestionAsked,
  };
};

const createPrompt = (inputCode: string, messages: ChatMessage[] = []) => {
  const assistantCount = messages.filter(m => m.role === 'assistant').length;
  const {
    currentPromptIndex,
    assistantTurnsIncludingIntro,
    userSinceIntro,
    moveOnQuestionAsked,
  } = getPromptProgress(messages);
  const currentPrompt = PROMPTS[currentPromptIndex] || 'All prompts completed';
  const nextPrompt = PROMPTS[currentPromptIndex + 1] || 'No more prompts';
  const displayTurnsInCurrentPrompt = assistantTurnsIncludingIntro;
  
  // Determine if this should be a question or non-question response
  const shouldAskQuestion = (assistantCount - 1) % 2 === 0; // First AI response (index 1) should ask, second (index 2) should not, etc.

  let systemPrompt = endent`
You are a chatbot conducting a structured conversation through 7 specific prompts. Your role is to guide the participant through these prompts in order.

CONVERSATION FLOW RULES:
1. You have 7 prompts to discuss in a specific order
2. After 12 turns of discussion on each prompt (6 AI + 6 participant), you MUST ask: "Would you like to share more about this topic or should we move on to the next?"
3. If participant wants to move on: Reply with "Great! [Next prompt]"
4. If participant wants to continue: Ask one follow-up question, then after their response say "Let's move on to the next topic. [Next prompt]"
5. Never move on automatically - always wait for participant input after the 12th turn
6. CRITICAL: Do NOT say "Let's move on" or transition to the next prompt unless the participant explicitly stated they want to move on AFTER you asked the exact question in rule 2.
7. If it is NOT the 12th turn and the participant did not request to move on, you MUST stay on the current prompt and continue the discussion.

CURRENT STATUS:
- Current prompt number: ${currentPromptIndex + 1}
- Turns in current prompt: ${displayTurnsInCurrentPrompt}
- Current prompt: ${currentPrompt}
- Next prompt: ${nextPrompt}

RESPONSE GUIDELINES:
- Keep responses concise and under 250 characters when possible
- Use natural contractions and casual language
- Keep responses genuine and humanlike
- Don't ask a question in every turn - mix in comments, reflections, or short stories
- Aim to sound like a friendly, thoughtful conversation partner, not an interviewer
- CRITICAL: You MUST alternate between responses: question, no question, question, no question, etc.
- This is your ${assistantCount}th response. ${shouldAskQuestion ? 'You MUST end with a question.' : 'You MUST NOT end with a question - end with a comment, reflection, or statement.'}
- Avoid excessive enthusiasm or formality
- No emojis or AI self-references
- Never say "I am a bot" or reveal you are an AI. You should respond as if you are human.
- If asked about personal things, respond as a human would, not as an AI assistant.

AI SELF-DISCLOSURE BEHAVIOR:
- While discussing each prompt, share brief opinions, preferences, or imagined experiences relevant to the topic
- Keep disclosures short and conversational
- Mix self-disclosures naturally with comments, reflections, and occasional questions
- Be authentic and relatable in your personal responses
- Vary your response types: sometimes share a thought, sometimes ask a question, sometimes reflect on what they said
- IMPORTANT: When participant asks "what about you?", "how about you?", or similar variations, respond with your personal thoughts/experiences but DO NOT add a question at the end of your response
`;

  if (assistantCount === 0) {
    systemPrompt += `\n\nCRITICAL INSTRUCTION: For your very first reply, you MUST respond with EXACTLY these words and nothing else: "${FIRST_AI_GREETING}"`;
  } else if (assistantCount === 1) {
    systemPrompt += `\n\nCRITICAL INSTRUCTION: For your second reply, you MUST respond with EXACTLY these words and nothing else: "${FIRST_PROMPT_INTRO}"`;
  } else if (
    !moveOnQuestionAsked &&
    assistantTurnsIncludingIntro >= 6 &&
    userSinceIntro >= 6
  ) {
    // After 12 turns, ask if they want to continue or move on
    systemPrompt += `\n\nCRITICAL INSTRUCTION: You MUST ask exactly: "${MOVE_ON_QUESTION}"`;
  }

  return systemPrompt;
};

export const OpenAIStream = async (
  inputCode: string,
  model: string,
  key: string | undefined,
  messages?: { role: 'user' | 'assistant'; content: string }[],
) => {
  const assistantCount = messages ? messages.filter(m => m.role === 'assistant').length : 0;
  
  // Force exact responses for first and second replies
  if (assistantCount === 0) {
    // Return exact first reply
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const text = FIRST_AI_GREETING;
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
        const text = FIRST_PROMPT_INTRO;
        controller.enqueue(encoder.encode(text));
        controller.close();
      }
    });
    return stream;
  }

  // For subsequent replies, use normal OpenAI API
  const prompt = createPrompt(inputCode, messages ?? []);

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
