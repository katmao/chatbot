import ReactMarkdown from 'react-markdown'
import { useColorModeValue } from '@chakra-ui/react'
import Card from '@/components/card/Card'

type MessageBoxProps = {
  output: string
  variant?: 'panel' | 'bubble'
  isUser?: boolean
  bg?: string
}

export default function MessageBox({
  output,
  variant = 'panel',
  isUser = false,
  bg,
}: MessageBoxProps) {
  const textColor = useColorModeValue('navy.700', 'white')
  const isPanel = variant === 'panel'
  const backgroundColor = bg ?? (isPanel ? undefined : isUser ? '#f4f6f8' : 'white')

  return (
    <Card
      display={output ? 'flex' : 'none'}
      px={isPanel ? '22px !important' : '20px'}
      py={isPanel ? '22px !important' : '16px'}
      color={textColor}
      minH={isPanel ? '450px' : 'auto'}
      fontSize={isPanel ? { base: 'sm', md: 'md' } : '1rem'}
      lineHeight={isPanel ? { base: '24px', md: '26px' } : '1.6'}
      fontWeight={isPanel ? '500' : 400}
      alignSelf={isPanel ? 'stretch' : isUser ? 'flex-end' : 'flex-start'}
      maxW={isPanel ? '100%' : '80%'}
      bg={backgroundColor}
      boxShadow={isPanel ? undefined : 'sm'}
      borderRadius={isPanel ? undefined : 'lg'}
      mb={isPanel ? undefined : '12px'}
    >
      <ReactMarkdown className={isPanel ? 'font-medium' : undefined}>
        {output || ''}
      </ReactMarkdown>
    </Card>
  )
}
