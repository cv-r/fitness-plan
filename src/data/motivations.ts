/** 激励语池 · 按日期固定挑选，同一天刷新不变 */
export const MOTIVATIONS: string[] = [
  '努力冲冲冲',
  '今天的汗水是明天的力量',
  '没有捷径，只有坚持',
  '重量不会说谎',
  '多练一组，多赢一次',
  '把每一次都当成最后一次',
  '你只需要比昨天更强一点',
  '身体是诚实的，练了就长',
  '进步来自重复，而不是灵感',
  '撑过今天，明天更轻',
  '别和昨天的自己讲和',
  '铁不会骗人',
  '专注当下这一组',
  '你来都来了，练完再走',
  '慢慢来，但别停下来',
];

/**
 * 用日期字符串做稳定哈希，保证同一天拿到同一条激励语。
 * 不依赖随机数，因此刷新 / 重开 App 都不会变。
 */
export function pickMotivation(dateISO: string): string {
  let hash = 2166136261;
  for (let i = 0; i < dateISO.length; i += 1) {
    hash ^= dateISO.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = Math.abs(hash) % MOTIVATIONS.length;
  return MOTIVATIONS[index];
}
