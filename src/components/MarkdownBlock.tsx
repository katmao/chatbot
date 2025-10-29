import { FC } from 'react';

interface Props {
  text: string;
}

const MarkdownBlock: FC<Props> = ({ text }) => (
  <div className="markdown-content" style={{ whiteSpace: 'pre-wrap' }}>
    {text}
  </div>
);

export default MarkdownBlock;
