import * as xml2js from 'xml2js';

/**
 * 解析 XML 字符串为对象
 * @param xml XML 字符串
 * @returns 解析后的对象
 */
export async function parseXml<T = Record<string, unknown>>(
  xml: string,
): Promise<T> {
  const parser = new xml2js.Parser({
    explicitArray: false,
    explicitRoot: false,
  });

  return new Promise((resolve, reject) => {
    parser.parseString(xml, (err: Error | null, result: T) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * 将对象转换为 XML 字符串
 * @param obj 对象
 * @param rootName 根节点名称
 * @returns XML 字符串
 */
export function buildXml(
  obj: Record<string, unknown>,
  rootName: string = 'xml',
): string {
  const builder = new xml2js.Builder({
    rootName,
    cdata: true,
    headless: true,
  });
  return builder.buildObject(obj);
}

/**
 * 构建微信回复消息 XML
 * @param toUser 接收者 OpenID
 * @param fromUser 发送者 (公众号原始ID)
 * @param content 消息内容
 * @param msgType 消息类型
 * @returns XML 字符串
 */
export function buildReplyXml(
  toUser: string,
  fromUser: string,
  content: string,
  msgType: string = 'text',
): string {
  const timestamp = Math.floor(Date.now() / 1000);

  if (msgType === 'text') {
    return `<xml>
  <ToUserName><![CDATA[${toUser}]]></ToUserName>
  <FromUserName><![CDATA[${fromUser}]]></FromUserName>
  <CreateTime>${timestamp}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`;
  }

  // 可扩展其他消息类型
  return '';
}
