import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@chakra-ui/react';

interface Props {
  onTranscriptionComplete: (text: string) => void;
  onListeningChange: (isListening: boolean) => void;
}

export default function VoiceRecorder({ onTranscriptionComplete, onListeningChange }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const toast = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        chunksRef.current = [];

        try {
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
          if (text) {
            onTranscriptionComplete(text);
          }
        } catch (error) {
          console.error('Transcription error:', error);
          toast({
            title: 'Error',
            description: 'Failed to convert speech to text',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }

        setIsRecording(false);
        onListeningChange(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      onListeningChange(true);
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: 'Error',
        description: 'Failed to access microphone',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [onTranscriptionComplete, onListeningChange, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }, [isRecording]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isRecording) {
          startRecording();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording) {
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording, startRecording, stopRecording]);

  return null; // Component is controlled through keyboard events
} 