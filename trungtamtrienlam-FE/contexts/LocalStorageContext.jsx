"use client"
import React, { createContext, useContext, useEffect, useState, useMemo } from "react"

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
        setUserInfo(userInfoRaw ? JSON.parse(userInfoRaw) : null)
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