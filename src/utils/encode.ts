/** 生成一个足够唯一的 id（时间戳 + 随机串），用于自定义动作与聊天消息 */
export function uid(prefix = ''): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const tail = Math.random().toString(36).slice(2, 6);
  return `${prefix}${time}${rand}${tail}`;
}

/** UTF-8 安全的 base64 编码（聊天记录导出用） */
export function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/** UTF-8 安全的 base64 解码 */
export function base64Decode(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
