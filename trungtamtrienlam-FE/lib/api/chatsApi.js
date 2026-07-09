import axiosInstance, {
  axiosCloudCDNInstance,
  axiosAIInstance
} from './axiosConfig'

const getStoredCurrentUserID = () => {
  if (typeof window === 'undefined') return ''

  try {
    const rawUserInfo = window.localStorage.getItem('userInfo')
    if (!rawUserInfo) return ''

    const userInfo = JSON.parse(rawUserInfo)
    return String(
      userInfo?.userID ??
        userInfo?.UserID ??
        userInfo?.id ??
        userInfo?.ID ??
        ''
    ).trim()
  } catch {
    return ''
  }
}

// Tạo cuộc trò chuyện
export const CreateChat = async formData => {
  try {
    const response = await axiosInstance.post('/Chat/CreateChat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to create chat')
    }
  } catch (error) {
    throw error
  }
}

// lấy danh sách group trò chuyện
export const getGroupChats = async (type, currentUserID) => {
  try {
    return (
      await axiosInstance.get('/Chat/GetList', {
        params: { type, currentUserID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

export const updateChatName = async (chatID, newName) => {
  try {
    const response = await axiosInstance.get('/Chat/UpdateChatName', {
      params: { chatID, newName }
    })

    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to update chat name')
    }
  } catch (error) {
    throw error
  }
}

// Đổi ảnh đại diện nhóm
export const updateChatAvatar = async (chatID, avatar) => {
  try {
    const formData = new FormData()
    formData.append('chatID', chatID)
    formData.append('avatar', avatar)

    const response = await axiosInstance.post('/Chat/UpdateChatAvatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to update chat avatar')
    }
  } catch (error) {
    throw error
  }
}

// Gửi tin nhắn
export const sendMessage = async messageData => {
  try {
    const formData = new FormData()
    Object.keys(messageData).forEach(key => {
      if (key === 'ChatFiles' && messageData[key]) {
        if (Array.isArray(messageData[key])) {
          messageData[key].forEach((file, index) => {
            formData.append(`ChatFiles[${index}]`, file)
          })
        } else if (messageData[key] instanceof File) {
          formData.append('ChatFiles', messageData[key])
        }
      } else {
        formData.append(key, messageData[key])
      }
    })

    const response = await axiosInstance.post('/Chat/SendChat', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to send message')
    }
  } catch (error) {
    throw error
  }
}

// export const sendMessageAI = async messageData => {
//   const prompt = `Bạn là trợ lý ảo thông minh, có khả năng tìm kiếm thông tin và trả lời bất cứ câu hỏi. Các thông tin tìm kiếm phải chính thống, có nguồn gốc rõ ràng, ưu tiên cập nhật các thông tin về nghị quyết, thông tư của Nhà nước Chính Phủ Việt Nam, liên quan nhiều lĩnh vực ngành nghề, ưu tiên ngành Văn Hóa Di Sản, Công Nghệ. Còn lại bạn có thể thoải mái trả lời các câu hỏi khó khăn thông minh, tình cảm giống như ChatGPT thế hệ mới.`

//   // const prompt = ``

//   // Có thể export để dùng trong component khác

//   const body = {
//     model: 'openai/gpt-oss-120b',
//     messages: messageData
//   }
//   try {
//     const response = await axiosAIInstance.post('/v1/chat/completions/', body)
//     return response
//   } catch (error) {
//     throw error
//   }
// }

// export const sendMessageAI = async (messageData) => {
//   // const prompt = `Bạn là trợ lý ảo thông minh, có khả năng tìm kiếm thông tin và trả lời bất cứ câu hỏi. Các thông tin tìm kiếm phải chính thống, có nguồn gốc rõ ràng, ưu tiên cập nhật các thông tin về nghị quyết, thông tư của Nhà nước Chính Phủ Việt Nam, liên quan nhiều lĩnh vực ngành nghề, ưu tiên ngành Văn Hóa Di Sản, Công Nghệ. Còn lại bạn có thể thoải mái trả lời các câu hỏi khó khăn thông minh, tình cảm giống như ChatGPT thế hệ mới.`

//   const prompt = `Bạn có thể thoải mái trả lời các câu hỏi khó khăn thông minh, tình cảm giống như ChatGPT thế hệ mới.`

//   const body = {
//     messages: messageData,
//   };

//   try {
//     const response = await fetch("/api/chat", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(body),
//     });

//     if (!response.ok) {
//       throw new Error(`Server error: ${response.status}`);
//     }

//     const data = await response.json();
//     return data; // Trả về kết quả AI
//   } catch (error) {
//     console.error("sendMessageAI error:", error);
//     throw error;
//   }
// };

export const sendMessageAI = async (messageData, linkId, messages = []) => {
  const body = {
    prompt: '',
    message: messageData,
    linkId: linkId,
    messages
  }
  try {
    const res = await fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json().catch(() => ({}))

    // Keep axios-like shape used by existing UI code
    return {
      status: res.status,
      data
    }
  } catch (error) {
    throw error
  }
}

// load tin nhắn
export const loadMes = async (chatID, extraParams = {}) => {
  try {
    const response = await axiosInstance.get('/Chat/GetDetail', {
      params: { chatID, ...extraParams }
    })

    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to update chat name')
    }
  } catch (error) {
    throw error
  }
}

//Thêm user vào nhóm chat
export const addUserToGroup = async formData => {
  try {
    const response = await axiosInstance.post('/Chat/InsertMember', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to update chat name')
    }
  } catch (error) {
    throw error
  }
}

//load user xin vào nhóm
export const loadUserRequest = async chatID => {
  try {
    const response = await axiosInstance.get('/Chat/ListUserWaitConfirm', {
      params: { chatID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to load user requests')
    }
  } catch (error) {
    throw error
  }
}

//duyệt thành viên vào nhóm
export const acceptUserRequest = async (chatAwaitConfrimID, status, currentUserID) => {
  try {
    const response = await axiosInstance.get('/Chat/ConfirmUserJoinGroup', {
      params: { chatAwaitConfrimID, status, currentUserID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to accept user request')
    }
  } catch (error) {
    throw error
  }
}

//rời nhóm
export const leaveGroup = async (chatID, userID) => {
  try {
    const response = await axiosInstance.get('/Chat/LeaveGroup', {
      params: { chatID, userID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to leave group')
    }
  } catch (error) {
    throw error
  }
}

//Giải tán nhóm
export const disbandGroup = async (chatID, currentUserID) => {
  try {
    const response = await axiosInstance.get('/Chat/RemoveGroup', {
      params: { chatID, currentUserID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to disband group')
    }
  } catch (error) {
    throw error
  }
}

//load AttackChat
export const loadFileAttackChat = async (chatID, messagetype) => {
  try {
    return (
      await axiosInstance.get('/Chat/GetAttack', {
        params: { chatID, messagetype }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//thu hồi tin nhắn
export const recallMessage = async messageID => {
  try {
    const response = await axiosInstance.get('/Chat/UnSend', {
      params: { messageID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to recall message')
    }
  } catch (error) {
    throw error
  }
}

//Lấy danh sách user theo chatid
export const getListUserByChatID = async (chatID, currentUserID) => {
  try {
    const safeChatID = String(chatID ?? '').trim()
    if (!safeChatID) {
      return {
        status: 200,
        message: 'Lấy dữ liệu thành công',
        data: { status: 200, message: null, data: [] },
        errors: null
      }
    }

    const safeCurrentUserID = String(
      currentUserID ?? getStoredCurrentUserID() ?? ''
    ).trim()
    const params = { chatID: safeChatID }
    if (safeCurrentUserID) {
      params.currentUserID = safeCurrentUserID
    }

    return (
      await axiosInstance.get('/Chat/GetUserByChatID', {
        params
      })
    ).data
  } catch (error) {
    throw error
  }
}

//Chọn phó nhóm
export const promoteToViceLeader = async (chatID, userID, currentUserID) => {
  try {
    const response = await axiosInstance.get('/Chat/ChooseSubLeader', {
      params: { chatID, userID, currentUserID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to promote user to vice leader')
    }
  } catch (error) {
    throw error
  }
}

//Xóa thành viên khỏi nhóm
export const removeViceLeader = async (chatID, userID, currentUserID) => {
  try {
    const response = await axiosInstance.get('/Chat/RemoveSubLeader', {
      params: { chatID, userID, currentUserID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to remove vice leader')
    }
  } catch (error) {
    throw error
  }
}

export const removeMemberFromGroup = async (chatID, userID, currentUserID) => {
  try {
    const response = await axiosInstance.get('/Chat/RemoveFromGroup', {
      params: { chatID, userID, currentUserID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to remove member from group')
    }
  } catch (error) {
    throw error
  }
}

//Nhượng quyền trưởng nhóm
export const transferGroupLeader = async (chatID, userID, currentUserID) => {
  try {
    const response = await axiosInstance.get('/Chat/ChooseLeader', {
      params: { chatID, userID, currentUserID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to transfer group leader')
    }
  } catch (error) {
    throw error
  }
}

//Chọn trưởng nhóm khi rời
export const changeLeaderAndLeaveGroup = async (chatID, userID) => {
  try {
    const response = await axiosInstance.get('/Chat/LeaveGroup', {
      params: { chatID, userID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to promote user to leader when leaving group')
    }
  } catch (error) {
    throw error
  }
}

//Tạo ghi chú
export const createNote = async noteData => {
  try {
    const response = await axiosInstance.post('/ChatNote/CreateNote', noteData)
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to create note')
    }
  } catch (error) {
    throw error
  }
}

//Lấy ghi chú theo chatID
export const getNotesByChatID = async chatID => {
  try {
    return (
      await axiosInstance.get('/ChatNote/GetList', {
        params: { chatID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//Lấy ghi chú theo noteID
export const getNotesByNoteID = async noteID => {
  try {
    return (
      await axiosInstance.get('/ChatNote/GetDetail', {
        params: { noteID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//Update ghi chú
export const updateNote = async noteData => {
  try {
    const response = await axiosInstance.post(
      '/ChatNote/UpdateNote',
      noteData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to update note')
    }
  } catch (error) {
    throw error
  }
}

//tạo bình chọn
export const createPoll = async pollData => {
  try {
    const response = await axiosInstance.post(
      '/ChatVote/CreateVote',
      pollData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to create poll')
    }
  } catch (error) {
    throw error
  }
}

// lấy bình chọn theo chatID
export const getPollsByChatID = async chatID => {
  try {
    return (
      await axiosInstance.get('/ChatVote/GetList', {
        params: { chatID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//bình chọn
export const votePoll = async voteData => {
  try {
    const response = await axiosInstance.post('/ChatVote/Vote', voteData, {
      headers: { 'Content-Type': 'application/json' }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to vote on poll')
    }
  } catch (error) {
    throw error
  }
}

//xem tin nhắn
export const markMessageAsSeen = async (messageId, currentUserId) => {
  try {
    console.log('[chat-seen:api-request]', { messageId, currentUserId })
    const response = await axiosInstance.get('/Chat/SeenChat', {
      params: {
        messageId,
        chatId: messageId,
        ...(currentUserId
          ? { userID: currentUserId, currentUserID: currentUserId }
          : {})
      }
    })
    console.log('[chat-seen:api-response]', {
      status: response.status,
      data: response.data
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to mark message as seen')
    }
  } catch (error) {
    throw error
  }
}

//Lấy kết quả vote
export const getPollResults = async voteID => {
  try {
    return (
      await axiosInstance.get('/ChatVote/GetVoteResult', {
        params: { voteID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

// tạo options mới cho poll
export const createOptionsPoll = async pollData => {
  try {
    const response = await axiosInstance.post(
      '/ChatVote/CreateOptions',
      pollData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to create poll')
    }
  } catch (error) {
    throw error
  }
}

// Tạo nhăc hẹn
export const createReminder = async reminderData => {
  try {
    const response = await axiosInstance.post(
      '/ChatRemind/CreateRemind',
      reminderData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to create reminder')
    }
  } catch (error) {
    throw error
  }
}

//lấy nhắc hẹn theo chatID
export const getRemindersByChatID = async chatID => {
  try {
    return (
      await axiosInstance.get('/ChatRemind/GetList', {
        params: { chatID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//chỉnh sửa nhăc hẹn
export const editReminder = async reminderData => {
  try {
    const response = await axiosInstance.post(
      '/ChatRemind/UpdateRemind',
      reminderData,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to edit reminder')
    }
  } catch (error) {
    throw error
  }
}

//Xác nhận tham gia nhắc hẹn
export const confirmJoinReminder = async (idChatRemind, type) => {
  try {
    const response = await axiosInstance.get('/ChatRemind/UserJoinChatRemind', {
      params: { idChatRemind, type }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to confirm join reminder')
    }
  } catch (error) {
    throw error
  }
}

//Lấy chi tiết nhắc hẹn
export const getReminderDetails = async chatRemindID => {
  try {
    return (
      await axiosInstance.get('/ChatRemind/GetDetail', {
        params: { chatRemindID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//ghim tin nhắn
export const pinMessage = async messageID => {
  try {
    const response = await axiosInstance.get('/Chat/PinMess', {
      params: { messageID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to pin message')
    }
  } catch (error) {
    throw error
  }
}

//lấy tin nhắn đã ghim
export const getPinnedMessages = async chatID => {
  try {
    return (
      await axiosInstance.get('/Chat/GetMessPin', {
        params: { chatID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

export const unpinMessage = async ({ messageID = [], eventID = [] }) => {
  const toArray = v => (Array.isArray(v) ? v : v != null ? [v] : [])

  const payload = {}
  const msg = toArray(messageID).filter(Boolean)
  const evt = toArray(eventID).filter(Boolean)

  if (msg.length) payload.messageID = msg
  if (evt.length) payload.eventID = evt

  const res = await axiosInstance.post('/Chat/UnpinMess', payload, {
    headers: { 'Content-Type': 'application/json' }
  })

  return res.data // ResultJs từ backend
}

//ghim hội thoại
export const pinChat = async chatID => {
  try {
    const response = await axiosInstance.get('/Chat/PinOrUnPinChat', {
      params: { chatID }
    })
    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to pin chat')
    }
  } catch (error) {
    throw error
  }
}

//lấy id của admin
export const getAdminUserID = async () => {
  try {
    return (await axiosInstance.get('/Chat/GetUserIDAdmin')).data
  } catch (error) {
    throw error
  }
}

//search tin nhắn trong chat
