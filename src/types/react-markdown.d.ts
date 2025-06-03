declare module 'react-markdown' {
  import { ReactNode } from 'react';

  interface ReactMarkdownProps {
    children: string;
    components?: Record<string, any>;
    className?: string;
  }

  export default function ReactMarkdown(props: ReactMarkdownProps): ReactNode;
} 