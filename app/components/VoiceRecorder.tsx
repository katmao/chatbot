'use client';

import { Button, Icon, Box, useToast } from '@chakra-ui/react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { MdMic, MdStop } from 'react-icons/md';
import { useState } from 'react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

const VoiceRecorder = ({ onRecordingComplete }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const toast = useToast();

  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl, blob) => {
      if (blob) {
        onRecordingComplete(blob);
      }
    },
  });

  const handleStartRecording = () => {
    setIsRecording(true);
    startRecording();
    toast({
      title: 'Recording started',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    stopRecording();
    toast({
      title: 'Recording stopped',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Box>
      <Button
        onClick={isRecording ? handleStopRecording : handleStartRecording}
        colorScheme={isRecording ? 'red' : 'blue'}
        leftIcon={<Icon as={isRecording ? MdStop : MdMic} />}
        isLoading={status === 'acquiring_media'}
        loadingText="Accessing microphone..."
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </Button>
    </Box>
  );
};

export default VoiceRecorder; 