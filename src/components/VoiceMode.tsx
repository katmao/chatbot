import { FC, useEffect, useState } from 'react';
import { Box, Circle, Flex, IconButton, Text, useColorModeValue } from '@chakra-ui/react';
import { MicrophoneIcon, SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface Props {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  onExitVoiceMode: () => void;
}

const VoiceMode: FC<Props> = ({ isListening, isProcessing, isSpeaking, onExitVoiceMode }) => {
  const [scale, setScale] = useState(1);
  const bgColor = useColorModeValue('gray.100', 'navy.700');
  const pulseColor = useColorModeValue('blue.500', 'blue.400');

  useEffect(() => {
    if (isListening || isSpeaking) {
      const interval = setInterval(() => {
        setScale(s => s === 1 ? 1.2 : 1);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isListening, isSpeaking]);

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      h="100%"
      minH="450px"
      position="relative"
    >
      <IconButton
        aria-label="Exit voice mode"
        icon={<XMarkIcon width={24} />}
        position="absolute"
        top={4}
        right={4}
        onClick={onExitVoiceMode}
      />
      
      <Circle
        size="200px"
        bg={bgColor}
        transition="all 0.3s ease"
        transform={`scale(${scale})`}
        position="relative"
      >
        <Circle
          size="180px"
          bg={isProcessing ? 'gray.500' : pulseColor}
          opacity={0.2}
          position="absolute"
        />
        <Circle
          size="160px"
          bg={isProcessing ? 'gray.500' : pulseColor}
          opacity={0.3}
          position="absolute"
        />
        {isListening ? (
          <MicrophoneIcon width={48} />
        ) : isSpeaking ? (
          <SpeakerWaveIcon width={48} />
        ) : (
          <Box p={8}>
            <Text textAlign="center" fontSize="sm">
              {isProcessing ? 'Processing...' : 'Tap to speak'}
            </Text>
          </Box>
        )}
      </Circle>
    </Flex>
  );
};

export default VoiceMode; 