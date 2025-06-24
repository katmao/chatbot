import { useColorModeValue } from '@chakra-ui/react'
import Card from '@/components/card/Card'
import { marked } from 'marked'
import { useMemo } from 'react'

interface Props {
  output: string;
  isUser?: boolean;
}

export default function MessageBox({ output, isUser = false }: Props) {
  // ChatGPT-like styles
  const userBg = useColorModeValue('#f7f7f8', '#26272b');
  const userText = useColorModeValue('#222', '#f7f7f8');
  const assistantBg = useColorModeValue('white', 'navy.700');
  const assistantText = useColorModeValue('navy.700', 'white');

  const content = useMemo(() => {
    return { __html: marked.parse(output || '', { async: false }) as string }
  }, [output])

  return (
    <Card
      display={output ? 'flex' : 'none'}
      px="20px"
      py="16px"
      color={isUser ? userText : assistantText}
      bg={isUser ? userBg : assistantBg}
      fontSize={{ base: 'md', md: 'md' }}
      lineHeight={{ base: '24px', md: '26px' }}
      fontWeight="400"
      borderRadius="lg"
      boxShadow={isUser ? 'sm' : 'xs'}
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxW="700px"
      my={2}
    >
      <div className="markdown-content" dangerouslySetInnerHTML={content} />
    </Card>
  )
}
