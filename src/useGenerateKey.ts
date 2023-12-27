import { onUnmounted } from "vue";

/**
 * 生成随机字符串的字符集
 */
export const generatekeys = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890".split("");
/**
 * 已经生成的随机字符串集合
 */
export const generatekeySet = new Set<string>();
/**
 * 随机获取字符集中的一个字符
 * @returns 一个随机字符
 */
export const randomKey = () => generatekeys[Math.floor(Math.random() * generatekeys.length)];
/**
 * 生成随机字符串的钩子函数
 * @returns 包含生成随机字符串和清除已生成字符串的方法的对象
 */
export function useGenerateKey() {
  /**
   * 已生成的随机字符串集合
   */
  const keySet = new Set<string>();
  /**
   * 生成指定长度的随机字符串
   * @param minLength 最小长度，默认为 4
   * @returns 生成的随机字符串
   */
  const generateKey = (minLength = 4) => {
    minLength <= 0 && (minLength = 1);
    let result = "";
    for (let i = 0; i < minLength; i++) result += randomKey();

    return generatekeySet.has(result)
      ? generateKey(++minLength)
      : generatekeySet.add(result) && keySet.add(result) && result;
  };

  /**
   * 清除已生成的随机字符串
   * @param keys 需要清除的随机字符串数组，默认清除所有已生成字符串
   */
  const clearKey = (...keys: string[]) => {
    if (keys.length == 0)
      keys.push(...keySet);
    keys.forEach(item => generatekeySet.delete(item) && keySet.delete(item));
  };
  // 在组件卸载前清除已生成的随机字符串
  onUnmounted(clearKey);

  return {
    generateKey,
    clearKey,
  };
}
