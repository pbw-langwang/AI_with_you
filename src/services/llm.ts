import type { LlmConfig } from '../types'
import { LLM_CONFIG } from '../constants'

class LlmService {
  /**
   * 发送消息到大语言模型
   * @param config - LLM配置对象
   * @param config.apiKey - API密钥
   * @param config.model - 模型名称
   * @param config.baseURL - 可选的基础URL
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<string | null> - 返回模型的回复内容，失败时返回null
   * @throws {Error} - 当请求失败时抛出错误
   */
  async sendMessage(config: LlmConfig, userMessage: string): Promise<string | null> {
    const baseURL = config.baseURL || LLM_CONFIG.BASE_URL
    const apiKey = config.apiKey
    const model = config.model

    try {
      console.log('发送LLM请求:', { model, message: userMessage })
      
      const response = await fetch(`${baseURL}/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: LLM_CONFIG.SYSTEM_PROMPT
                }
              ]
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: userMessage
                }
              ]
            }
          ]
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API请求失败: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      console.log('LLM响应:', data)
      
      // 解析响应，提取文本内容
      const messageOutput = data.output?.find((item: any) => item.type === 'message' && item.role === 'assistant')
      const reply = messageOutput?.content?.find((item: any) => item.type === 'output_text')
      return reply?.text || null
    } catch (error) {
      console.error('LLM请求失败:', error)
      throw error
    }
  }

  /**
   * 流式发送消息（预留接口）
   * @param config - LLM配置对象
   * @param config.apiKey - API密钥
   * @param config.model - 模型名称
   * @param config.baseURL - 可选的基础URL
   * @param userMessage - 用户输入的消息内容
   * @returns Promise<AsyncIterable<string>> - 返回异步可迭代的字符串流
   * @throws {Error} - 当请求失败时抛出错误
   */
  async sendMessageWithStream(config: LlmConfig, userMessage: string): Promise<AsyncIterable<string>> {
    // 本地“Trae Assistant”模型：无需调用外部API
    if (config.model === 'trae-assistant') {
      const reply = `Trae Assistant：已禁用语音接入。你的输入：${userMessage}`
      return (async function* () {
        // 简单流式：分两段输出
        const mid = Math.max(1, Math.floor(reply.length / 2))
        yield reply.slice(0, mid)
        yield reply.slice(mid)
      })()
    }

    // 豆包API的流式接口实现
    const baseURL = config.baseURL || LLM_CONFIG.BASE_URL
    const apiKey = config.apiKey
    const model = config.model

    try {
      const response = await fetch(`${baseURL}/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: LLM_CONFIG.SYSTEM_PROMPT
                }
              ]
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: userMessage
                }
              ]
            }
          ],
          stream: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API请求失败: ${errorData.error?.message || response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取响应流')
      }

      return (async function* () {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = new TextDecoder().decode(value)
          // 处理流式响应，这里需要根据豆包API的实际流式格式进行解析
          yield chunk
        }
      })()
    } catch (error) {
      console.error('LLM流式请求失败:', error)
      throw error
    }
  }
}

export const llmService = new LlmService()
