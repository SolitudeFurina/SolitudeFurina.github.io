// 阅读时长与朗读时长估算。
// 中日韩文字按「字数」计，西文按「词数」计——用 split(/\s+/) 统计中文会把一整段算成一个词，
// 导致中文长文永远显示「1 分钟读完」。

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

/** 去掉代码块与行内代码：代码不计入阅读时长 */
export function stripCode(text: string): string {
  return (text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ');
}

/** 统计中日韩字符数与西文词数 */
export function countUnits(text: string): { cjk: number; latin: number } {
  const source = text ?? '';
  const cjk = (source.match(CJK) ?? []).length;
  const latin = (source.replace(CJK, ' ').match(/[A-Za-z0-9][A-Za-z0-9'’_-]*/g) ?? []).length;
  return { cjk, latin };
}

/** 阅读时长（分钟）：中文 400 字/分钟，西文 200 词/分钟，最少 1 分钟 */
export function readingMinutes(body: string): number {
  const { cjk, latin } = countUnits(stripCode(body));
  return Math.max(1, Math.ceil(cjk / 400 + latin / 200));
}

/** 朗读时长（分钟）：中文 240 字/分钟，西文 150 词/分钟，最少 1 分钟 */
export function narrationMinutes(text: string): number {
  const { cjk, latin } = countUnits(stripCode(text));
  return Math.max(1, Math.ceil(cjk / 240 + latin / 150));
}
