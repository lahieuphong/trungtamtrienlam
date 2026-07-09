import axiosInstance from './axiosConfig'

export const readNotification = async (id) => {
  if (!id) return null
  try {
    return (await axiosInstance.post(`/notifications/${id}/mark-read/`)).data
  } catch {
    return null
  }
}
