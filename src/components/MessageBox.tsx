import { useColorModeValue } from '@chakra-ui/react'
import Card from '@/components/card/Card'
import { marked } from 'marked'
import { useMemo } from 'react'

interface Props {
  output: string;
  isUser?: boolean;
  bg?: string;
}

export default function MessageBox({ output, isUser = false, bg }: Props) {
  const textColor = useColorModeValue('gray.800', 'white')
  const bgColor = bg ?? (isUser ? '#f4f6f8' : 'white')

  const content = useMemo(() => {
    return { __html: marked.parse(output || '', { async: false }) as string }
  }, [output])

  return (
    <Card
      display={output ? 'flex' : 'none'}
      px="20px"
      py="16px"
      color={textColor}
      bg={bgColor}
      fontSize="1rem"
      lineHeight="1.6"
      fontWeight={400}
      alignSelf={isUser ? 'flex-end' : 'flex-start'}
      maxW="100%"
      boxShadow="sm"
      borderRadius="lg"
      mb="12px"
    >
      <div className="markdown-content" style={{ width: '100%' }} dangerouslySetInnerHTML={content} />
    </Card>
  )
}
