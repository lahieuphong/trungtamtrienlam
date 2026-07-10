import axiosInstance from './axiosConfig'

export const getNotifications = async () => {
  try {
    return (await axiosInstance.get('/notifications/')).data
  } catch {
    return []
  }
}

export const markAllNotificationsRead = async () => {
  try {
    return (await axiosInstance.post('/notifications/mark-all-read/')).data
  } catch {
    return null
  }
}

export const readNotification = async (id) => {
  if (!id) return null
  try {
    return (await axiosInstance.post(`/notifications/${id}/mark-read/`)).data
  } catch {
    return null
  }
}
