'use client'

const onMessageForeground = () => () => {}
const checkPermissionNotification = () => 'unsupported'
const checkIsHaveServiceWorker = () => false
const getWebPushNotificationKey = () => null
const registerPushNotification = async () => false
const unRegisterPushNotification = async () => true

export {
  onMessageForeground,
  checkPermissionNotification,
  checkIsHaveServiceWorker,
  getWebPushNotificationKey,
  registerPushNotification,
  unRegisterPushNotification,
}
