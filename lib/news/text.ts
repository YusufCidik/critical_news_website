const segmenter = new Intl.Segmenter(undefined, { granularity: "sentence" });

export function newsSentences(text: string, limit: number) {
  const result: string[] = [];
  for (const { segment } of segmenter.segment(text)) {
    const sentence = segment.trim();
    if (sentence) result.push(sentence);
    if (result.length >= limit) break;
  }
  return result;
}
