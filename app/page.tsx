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
import { logVoiceInteraction } from '@/lib/firebase';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleUserInput = useCallback(async (text: string) => {
    // Add the new user message to the local state
    const newUserMessage = {
      role: 'user' as 'user',
      content: text,
      timestamp: Date.now()
    };
    
    setMessages(prev => {
      const updatedMessages = [...prev, newUserMessage];
      
      // Send the complete message history (including previous assistant messages) to the backend
      (async () => {
        try {
          const response = await fetch('/api/chatAPI', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              inputCode: text,
              model: 'gpt-4o',
              messages: updatedMessages 
            })
          });

          if (!response.ok) throw new Error('Failed to get response');

          const data = await response.text();
          // Add assistant reply to message history
          setMessages(prevMsgs => ([
            ...prevMsgs,
            {
              role: 'assistant' as 'assistant',
              content: data,
              timestamp: Date.now()
            }
          ]));
          
          // Save voice interaction to Firebase
          try {
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const prolificPid = new URLSearchParams(window.location.search).get('PROLIFIC_PID') || 'unknown_pid';
            const turnNumber = Math.floor((updatedMessages.length + 1) / 2);
            
            await logVoiceInteraction({
              userMessage: text,
              assistantMessage: data,
              turnNumber: turnNumber,
              sessionId: sessionId,
              prolificPid: prolificPid,
              interactionType: 'voice'
            });
          } catch (firebaseError) {
            console.error('Error saving to Firebase:', firebaseError);
          }
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
      })();

      return updatedMessages;
    });
  }, [toast]);

  // Notification system removed - AI now handles prompt transitions automatically

  return (
    <Box bg="#fff" minH="100vh" position="relative">
      <Box pb="90px" maxW="600px" mx="auto" pt={8}>
        {messages.filter(m => m.role === 'user').map((message) => (
          <MessageBox
            key={message.timestamp}
            output={message.content}
            isUser={true}
            bg="#e5e7eb"
          />
        ))}
        <div ref={messagesEndRef} />
      </Box>
      
      {/* Speaking indicator moved to bottom */}
      {isSpeaking && (
        <Box
          position="fixed"
          bottom="80px"
          left="50%"
          transform="translateX(-50%)"
          zIndex={5}
          maxW="600px"
          w="100%"
          px={2}
        >
          <Flex align="center" gap={2} justify="center">
            <Box
              as="span"
              boxSize="16px"
              borderRadius="full"
              bg="blue.400"
              animation={`${keyframes`0%{opacity:1}50%{opacity:0.3}100%{opacity:1}`} 1s infinite`}
            />
            <Text color="#222" fontWeight="500">Agent is speaking...</Text>
          </Flex>
        </Box>
      )}
      
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
