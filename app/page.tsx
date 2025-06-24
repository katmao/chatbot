'use client';
/*eslint-disable*/

import Link from '@/components/link/Link';
import MessageBox from '@/components/MessageBox';
import { ChatBody, OpenAIModel } from '@/types/types';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Flex,
  Icon,
  Img,
  Input,
  Text,
  useColorModeValue,
  useToast,
  IconButton,
  Container,
} from '@chakra-ui/react';
import { useEffect, useState, useRef, MouseEvent, useCallback, FormEvent } from 'react';
import { MdAutoAwesome, MdBolt, MdEdit, MdPerson, MdVolumeUp } from 'react-icons/md';
import Bg from '../public/img/chat/bg-image.png';
import { ChatMessage, ChatState } from '@/types/chat';
import { keyframes } from '@emotion/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  audioUrl?: string;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const toast = useToast();
  const [input, setInput] = useState('');

  const handleUserInput = useCallback(async (text: string) => {
    setMessages(prev => ([...prev, {
      role: 'user',
      content: text,
      timestamp: Date.now()
    }]));

    try {
      const response = await fetch('/api/chatAPI', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputCode: text })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.text();
      // Play assistant response as audio only
      const speechResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data })
      });
      if (!speechResponse.ok) throw new Error('Failed to convert to speech');
      const audioBlob = await speechResponse.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setIsSpeaking(false);
    }
  }, [toast]);

  return (
    <Box bg="#fff" minH="100vh" position="relative">
      <Box pb="90px" maxW="600px" mx="auto" pt={8}>
        {/* Speaking indicator */}
        {isSpeaking && (
          <Flex align="center" gap={2} mb={2}>
            <Box
              as="span"
              boxSize="16px"
              borderRadius="full"
              bg="blue.400"
              animation={`${keyframes`0%{opacity:1}50%{opacity:0.3}100%{opacity:1}`} 1s infinite`}
            />
            <Text color="#222" fontWeight="500">Agent is speaking...</Text>
          </Flex>
        )}
        {messages.map((message) => (
          <MessageBox
            key={message.timestamp}
            output={message.content}
            isUser={true}
            bg="#e5e7eb"
          />
        ))}
      </Box>
      <Box as="form" onSubmit={(e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
          handleUserInput(input.trim());
          setInput('');
        }
      }}
        position="fixed"
        bottom={0}
        left={0}
        w="100%"
        bg="#fff"
        py={4}
        px={2}
        zIndex={10}
      >
        <Flex maxW="600px" mx="auto" gap={2} align="center">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  handleUserInput(input.trim());
                  setInput('');
                }
              }
            }}
            bg="#e5e7eb"
            border="1px solid #d1d5db"
            borderRadius="md"
            _focus={{ boxShadow: 'none', border: '1.5px solid #a3a3a3', bg: '#e5e7eb' }}
            autoFocus
          />
          <Button
            type="submit"
            bg="#d1d5db"
            color="#222"
            _hover={{ bg: '#e5e7eb' }}
            borderRadius="md"
            isDisabled={!input.trim()}
          >
            Send
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}
