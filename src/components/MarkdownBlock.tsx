import { FC, useMemo } from 'react';
import { marked } from 'marked';

interface Props {
  text: string;
}

const MarkdownBlock: FC<Props> = ({ text }) => {
  const content = useMemo(() => {
    return { __html: marked.parse(text, { async: false }) as string };
  }, [text]);

  return <div className="markdown-content" dangerouslySetInnerHTML={content} />;
};

export default MarkdownBlock;
