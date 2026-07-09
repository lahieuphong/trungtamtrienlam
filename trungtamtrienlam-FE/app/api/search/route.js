import {
  AI_ALLOWED_TOPIC_SYSTEM_PROMPT,
  filterUserInput,
  filterAIResponse,
  hasAllowedAIContext,
  isAllowedAITopic,
  isLegalFollowUpQuestion
} from '@/helpers/aiContentFilter'
import {
  appendCitations,
  createWebSearchResponse,
  getResponseCitations,
  getResponseText
} from '@/lib/aiWebSearch'

function buildScopedMessages(body, message, currentDate) {
  const history = Array.isArray(body?.messages)
    ? body.messages
        .filter((item) => ['user', 'assistant'].includes(item?.role))
        .map((item) => ({
          role: item.role,
          content: String(item.content || '').trim()
        }))
        .filter((item) => item.content)
        .slice(-12)
    : []

  const lastHistoryMessage = history[history.length - 1]
  const needsCurrentMessage =
    !lastHistoryMessage ||
    lastHistoryMessage.role !== 'user' ||
    lastHistoryMessage.content !== message.trim()

  return [
    { role: 'system', content: AI_ALLOWED_TOPIC_SYSTEM_PROMPT },
    {
      role: 'system',
      content: `Ngày hiện tại theo giờ Việt Nam là ${currentDate}.`
    },
    ...history,
    ...(needsCurrentMessage
      ? [{ role: 'user', content: message.trim() }]
      : [])
  ]
}

export async function POST (req) {
  try {
    const body = await req.json().catch(() => ({}))
    const message = typeof body?.message === 'string' ? body.message : ''
    const currentDate = new Date().toLocaleDateString('vi-VN', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })

    if (!message.trim()) {
      return Response.json(
        { message: 'Thiếu nội dung câu hỏi.' },
        { status: 400 }
      )
    }

    const inputCheck = filterUserInput(message, { enforceAllowedTopic: false })
    if (!inputCheck.allowed) {
      return Response.json({ message: inputCheck.refusalMessage }, { status: 200 })
    }
    const allowedByTopic =
      isAllowedAITopic(message) ||
      (isLegalFollowUpQuestion(message) && hasAllowedAIContext(body?.messages))

    if (!allowedByTopic) {
      const topicCheck = filterUserInput(message)
      return Response.json({ message: topicCheck.refusalMessage }, { status: 200 })
    }

    const completion = await createWebSearchResponse(
      buildScopedMessages(body, message, currentDate)
    )

    const rawAnswer =
      appendCitations(getResponseText(completion), getResponseCitations(completion)) ||
      'Xin lỗi, tôi không có câu trả lời.'

    const outputCheck = filterAIResponse(rawAnswer)

    return Response.json({ message: outputCheck.safeResponse }, { status: 200 })
  } catch (error) {
    console.error('POST /api/ai/search error:', error)
    return Response.json(
      { message: 'AI hiện tại không khả dụng. Vui lòng thử lại sau.' },
      { status: 500 }
    )
  }
}
