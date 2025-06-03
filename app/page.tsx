'use client';
/*eslint-disable*/

import Link from '@/components/link/Link';
import MessageBoxChat from '@/components/MessageBox';
import VoiceRecorder from './components/VoiceRecorder';
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
} from '@chakra-ui/react';
import { useEffect, useState, useRef, MouseEvent } from 'react';
import { MdAutoAwesome, MdBolt, MdEdit, MdPerson, MdVolumeUp } from 'react-icons/md';
import Bg from '../public/img/chat/bg-image.png';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
  audioUrl?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const toast = useToast();

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    try {
      setIsLoading(true);
      
      // Add user message
      setMessages(prev => [...prev, { role: 'user', content: inputText }]);

      // Send to chat API
      const response = await fetch('/api/chatAPI', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputCode: inputText,
          model: 'gpt-4'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = response.body;
      if (!data) {
        throw new Error('No data received');
      }

      // Read the streaming response
      const reader = data.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        fullResponse += chunk;
        
        // Update the assistant's message
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1]?.role === 'assistant') {
            newMessages[newMessages.length - 1].content = fullResponse;
          } else {
            newMessages.push({ role: 'assistant', content: fullResponse });
          }
          return newMessages;
        });
      }

      // Convert response to speech
      const speechResponse = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: fullResponse }),
      });

      if (!speechResponse.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await speechResponse.blob();
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(audioBlob);
        audioRef.current.play();
      }

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process request',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
      setInputText('');
    }
  };

  const handleVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        
        // Convert speech to text
        const formData = new FormData();
        formData.append('audio', audioBlob);

        const response = await fetch('/api/speech-to-text', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to convert speech to text');
        }

        const { text } = await response.json();
        setInputText(text);
        handleSubmit();
      };

      // Start recording
      mediaRecorder.start();
      toast({
        title: 'Recording started',
        description: 'Speak your message',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });

      // Stop recording after 5 seconds
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, 5000);

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to access microphone',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Flex direction="column" h="100vh" p={4} maxW="800px" mx="auto">
      <audio ref={audioRef} style={{ display: 'none' }} />
      
      {/* Messages */}
      <Flex
        direction="column"
        flex={1}
        overflowY="auto"
        mb={4}
        gap={4}
      >
        {messages.map((message, index) => (
          <Box
            key={index}
            alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
            bg={message.role === 'user' ? 'blue.500' : 'gray.200'}
            color={message.role === 'user' ? 'white' : 'black'}
            p={3}
            borderRadius="lg"
            maxW="80%"
          >
            <Text>{message.content}</Text>
          </Box>
        ))}
      </Flex>

      {/* Input */}
      <Flex gap={2}>
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message..."
          onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <Button
          onClick={handleVoiceInput}
          colorScheme="blue"
          isLoading={isLoading}
        >
          Voice
        </Button>
        <Button
          onClick={handleSubmit}
          colorScheme="green"
          isLoading={isLoading}
        >
          Send
        </Button>
      </Flex>
    </Flex>
  );
}
