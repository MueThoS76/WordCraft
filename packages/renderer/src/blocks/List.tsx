import type { ListAttributes } from "@presscraft/blocks";

export function List({ ordered, items }: ListAttributes) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag>
      {(items ?? []).map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </Tag>
  );
}
