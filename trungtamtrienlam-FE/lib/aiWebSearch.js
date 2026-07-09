import { openai } from '@/lib/openAi'

const DEFAULT_SEARCH_MODEL = process.env.OPENAI_MODEL || 'gpt-5'

function normalizeMessages(messages = []) {
  return Array.isArray(messages)
    ? messages
      .filter((message) =>
        ['system', 'developer', 'user', 'assistant'].includes(message?.role)
      )
      .map((message) => ({
        role: message.role,
        content: String(message.content || '').trim()
      }))
      .filter((message) => message.content)
    : []
}

function splitMessages(messages = []) {
  const normalizedMessages = normalizeMessages(messages)
  const instructions = normalizedMessages
    .filter((message) => ['system', 'developer'].includes(message.role))
    .map((message) => message.content)
    .join('\n\n')

  const input = normalizedMessages
    .filter((message) => ['user', 'assistant'].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: message.content
    }))

  return {
    instructions,
    input: input.length ? input : 'Hãy hỗ trợ tra cứu văn bản pháp luật trong phạm vi được phép.'
  }
}

export async function createWebSearchResponse(messages, options = {}) {
  const { instructions, input } = splitMessages(messages)
  const model = DEFAULT_SEARCH_MODEL

  return openai.responses.create({
    model,
    ...(instructions ? { instructions } : {}),
    input,
    tools: [{ type: 'web_search' }],
    tool_choice: options.toolChoice || 'required'
  })
}

export function getResponseText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim()
  }

  const textParts = []
  for (const item of response?.output || []) {
    if (item?.type !== 'message') continue
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') {
        textParts.push(content.text)
      }
    }
  }

  return textParts.join('\n').trim()
}

export function getResponseCitations(response) {
  const citations = []
  const seenUrls = new Set()

  for (const item of response?.output || []) {
    if (item?.type !== 'message') continue

    for (const content of item?.content || []) {
      for (const annotation of content?.annotations || []) {
        if (annotation?.type !== 'url_citation' || !annotation?.url) continue
        if (seenUrls.has(annotation.url)) continue

        seenUrls.add(annotation.url)
        citations.push({
          title: annotation.title || annotation.url,
          url: annotation.url
        })
      }
    }
  }

  return citations
}

export function appendCitations(text, citations = []) {
  const answer = String(text || '').trim()
  const uniqueCitations = citations.filter((citation) => citation?.url).slice(0, 6)

  if (!answer || uniqueCitations.length === 0) {
    return answer
  }

  const sourceList = uniqueCitations
    .map((citation, index) => {
      const title = String(citation.title || citation.url).replace(/\]/g, '\\]')
      return `${index + 1}. [${title}](${citation.url})`
    })
    .join('\n')

  return `${answer}\n\nNguồn tham khảo:\n${sourceList}`
}

export function toChatCompletionLikeResponse(response, content) {
  return {
    id: response?.id,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: response?.model || DEFAULT_SEARCH_MODEL,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content
        },
        finish_reason: 'stop'
      }
    ],
    usage: response?.usage
  }
}
