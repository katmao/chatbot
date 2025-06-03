import { useColorModeValue } from '@chakra-ui/react'
import Card from '@/components/card/Card'
import { marked } from 'marked'
import { useMemo } from 'react'

export default function MessageBox(props: { output: string }) {
  const { output } = props
  const textColor = useColorModeValue('navy.700', 'white')

  const content = useMemo(() => {
    return { __html: marked.parse(output || '', { async: false }) as string }
  }, [output])

  return (
    <Card
      display={output ? 'flex' : 'none'}
      px="22px !important"
      pl="22px !important"
      color={textColor}
      minH="450px"
      fontSize={{ base: 'sm', md: 'md' }}
      lineHeight={{ base: '24px', md: '26px' }}
      fontWeight="500"
    >
      <div className="font-medium markdown-content" dangerouslySetInnerHTML={content} />
    </Card>
  )
}
