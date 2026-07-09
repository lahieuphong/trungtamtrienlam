"use client"
import React, { createContext, useContext, useEffect, useState, useMemo } from "react"


const normalizeUserInfo = userInfo => {
  if (!userInfo || typeof userInfo !== 'object') return null

  const userID = String(
    userInfo.userID ?? userInfo.UserID ?? userInfo.id ?? userInfo.ID ?? ''
  ).trim()
  const fullName = String(
    userInfo.fullName ??
      userInfo.FullName ??
      userInfo.full_name ??
      [userInfo.first_name, userInfo.last_name].filter(Boolean).join(' ') ??
      userInfo.username ??
      ''
  ).trim()

  return {
    ...userInfo,
    ...(userID ? { userID, UserID: userID } : {}),
    ...(fullName ? { fullName, FullName: fullName } : {})
  }
}
const LoadLocalStorageContext = createContext({
  userInfo: null,
  roleInfo: null,
  permissionInfo: []
})

export const useLoadLocalStorage = () => useContext(LoadLocalStorageContext)

export const LoadLocalStorageProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null)
  const [roleInfo, setRoleInfo] = useState(null)
  const [permissionInfo, setPermissionInfo] = useState([])

  useEffect(() => {
    const syncFromLocalStorage = () => {
      try {
        const userInfoRaw = localStorage.getItem("userInfo")
        const roleInfoRaw = localStorage.getItem("roleInfo")
        const permissionInfoRaw = localStorage.getItem("permissionInfo")
        setUserInfo(userInfoRaw ? normalizeUserInfo(JSON.parse(userInfoRaw)) : null)
        setRoleInfo(roleInfoRaw ? JSON.parse(roleInfoRaw) : null)
        setPermissionInfo(permissionInfoRaw ? JSON.parse(permissionInfoRaw) : [])
      } catch (error) {
        setUserInfo(null)
        setRoleInfo(null)
        setPermissionInfo([])
      }
    }
    syncFromLocalStorage()
    window.addEventListener("storage", syncFromLocalStorage)
    window.addEventListener("localStorageUpdate", syncFromLocalStorage)
    return () => {
      window.removeEventListener("storage", syncFromLocalStorage)
      window.removeEventListener("localStorageUpdate", syncFromLocalStorage)
    }
  }, [])

  const value = useMemo(() => ({
    userInfo,
    roleInfo,
    permissionInfo
  }), [userInfo, roleInfo, permissionInfo])

  return (
    <LoadLocalStorageContext.Provider value={value}>
      {children}
    </LoadLocalStorageContext.Provider>
  )
}