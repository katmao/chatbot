import ReactMarkdown from 'react-markdown';
import { FC } from 'react';

interface Props {
  text: string;
}

const MarkdownBlock: FC<Props> = ({ text }) => {
  return <ReactMarkdown>{text}</ReactMarkdown>;
};

export default MarkdownBlock;
