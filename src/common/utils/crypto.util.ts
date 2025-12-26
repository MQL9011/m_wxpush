import * as crypto from 'crypto';

/**
 * 微信签名验证
 * @param token 微信配置的 Token
 * @param timestamp 时间戳
 * @param nonce 随机数
 * @returns 签名字符串
 */
export function generateSignature(
  token: string,
  timestamp: string,
  nonce: string,
): string {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join('');
  return crypto.createHash('sha1').update(str).digest('hex');
}

/**
 * 验证微信签名
 * @param signature 微信传来的签名
 * @param token 微信配置的 Token
 * @param timestamp 时间戳
 * @param nonce 随机数
 * @returns 是否验证通过
 */
export function verifySignature(
  signature: string,
  token: string,
  timestamp: string,
  nonce: string,
): boolean {
  const calculatedSignature = generateSignature(token, timestamp, nonce);
  return signature === calculatedSignature;
}
