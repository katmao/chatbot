import { useColorModeValue } from '@chakra-ui/react'
import Card from '@/components/card/Card'
import { marked } from 'marked'
import { useMemo } from 'react'

interface Props {
  output: string;
  isUser?: boolean;
}

export default function MessageBox({ output, isUser = false }: Props) {
  const textColor = useColorModeValue('navy.700', 'white')
  const bgColor = useColorModeValue(
    isUser ? 'blue.500' : 'white',
    isUser ? 'blue.400' : 'navy.700'
  )

  const content = useMemo(() => {
    return { __html: marked.parse(output || '', { async: false }) as string }
  }, [output])

  return (
    <Card
      display={output ? 'flex' : 'none'}
      px="22px !important"
      pl="22px !important"
      color={isUser ? 'white' : textColor}
      bg={bgColor}
      fontSize={{ base: 'sm', md: 'md' }}
      lineHeight={{ base: '24px', md: '26px' }}
      fontWeight="500"
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxW="80%"
    >
      <div className="markdown-content" dangerouslySetInnerHTML={content} />
    </Card>
  )
}
