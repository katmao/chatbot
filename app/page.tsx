'use client';
/*eslint-disable*/

import Link from '@/components/link/Link';
import MessageBox from '@/components/MessageBox';
import VoiceRecorder from '@/components/VoiceRecorder';
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
import { useEffect, useState, useRef, MouseEvent, useCallback } from 'react';
import { MdAutoAwesome, MdBolt, MdEdit, MdPerson, MdVolumeUp } from 'react-icons/md';
import Bg from '../public/img/chat/bg-image.png';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import VoiceMode from '@/components/VoiceMode';
import { ChatMessage, ChatState } from '@/types/chat';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  audioUrl?: string;
}

export default function Home() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isVoiceMode: false,
    isListening: false,
    isProcessing: false,
    isSpeaking: false
  });

  const toast = useToast();

  const handleVoiceInput = useCallback(async (text: string) => {
    // Add user message to history
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, {
        role: 'user',
        content: text,
        timestamp: Date.now()
      }],
      isProcessing: true
    }));

    try {
      const response = await fetch('/api/chatAPI', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputCode: text })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.text();
      
      // Add assistant message to history
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: data,
          timestamp: Date.now()
        }],
        isProcessing: false,
        isSpeaking: true
      }));

      // Convert response to speech
      const speechResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data })
      });

      if (!speechResponse.ok) throw new Error('Failed to convert to speech');

      const audioBlob = await speechResponse.blob();
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      audio.onended = () => {
        setState(prev => ({ ...prev, isSpeaking: false }));
      };
      
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
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  }, [toast]);

  const toggleVoiceMode = () => {
    setState(prev => ({ ...prev, isVoiceMode: !prev.isVoiceMode }));
  };

  const handleExitVoiceMode = () => {
    setState(prev => ({ 
      ...prev, 
      isVoiceMode: false,
      isListening: false,
      isProcessing: false,
      isSpeaking: false
    }));
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Flex direction="column" gap={4}>
        {state.isVoiceMode ? (
          <VoiceMode
            isListening={state.isListening}
            isProcessing={state.isProcessing}
            isSpeaking={state.isSpeaking}
            onExitVoiceMode={handleExitVoiceMode}
          />
        ) : (
          <>
            {state.messages.map((message) => (
              <MessageBox
                key={message.timestamp}
                output={message.content}
                isUser={message.role === 'user'}
              />
            ))}
          </>
        )}
        
        <Box position="fixed" bottom={8} right={8}>
          <IconButton
            aria-label="Toggle voice mode"
            icon={<MicrophoneIcon width={24} />}
            size="lg"
            colorScheme={state.isVoiceMode ? 'blue' : 'gray'}
            onClick={toggleVoiceMode}
          />
        </Box>

        <VoiceRecorder
          onTranscriptionComplete={handleVoiceInput}
          onListeningChange={(isListening: boolean) => 
            setState(prev => ({ ...prev, isListening }))
          }
        />
      </Flex>
    </Container>
  );
}
