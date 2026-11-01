import type { HeadingAttributes } from "@presscraft/blocks";

export function Heading({ text, level }: HeadingAttributes) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag>{text}</Tag>;
}
