import apiClient from '@/utils/apiClient'

export const fetchRoleDropdown_Account = async () => {
    try {
        return (await apiClient.get('/accounts/dropdown/roles/')).data
    } catch (error) {
        throw error
    }
}

export const fetchDepartmentDropdown = async () => {
    try {
        return (await apiClient.get('/accounts/dropdown/departments/')).data
    } catch (error) {
        throw error
    }
}

export const fetchOrganizationDropdown = async () => {
    try {
        return (await apiClient.get('/accounts/dropdown/organizations/')).data
    } catch (error) {
        throw error
    }
}

export const fetchProvinceDropdown = async () => {
    try {
        return (await apiClient.get('/accounts/dropdown/provinces/')).data
    } catch (error) {
        throw error
    }
}

export const fetchDistrictDropdown = async (params = { provinceId: '' }) => {
    try {
        return (await apiClient.get('/accounts/dropdown/districts/', { params })).data
    } catch (error) {
        throw error
    }
}
export const fetchWardDropdown = async (params = { provinceId: '' }) => {
    try {
        return (await apiClient.get('/accounts/dropdown/wards/', { params })).data
    } catch (error) {
        throw error
    }
}

const USERS_DROPDOWN_FOR_CHATS_CACHE_TTL_MS = 60 * 1000
let usersDropdownForChatsCache = null
let usersDropdownForChatsCacheExpiresAt = 0
let usersDropdownForChatsRequest = null

export const clearUsersDropdownForChatsCache = () => {
    usersDropdownForChatsCache = null
    usersDropdownForChatsCacheExpiresAt = 0
    usersDropdownForChatsRequest = null
}

export const fetchUsersDropdownForChats = async (options = {}) => {
    const forceRefresh = options?.force === true || options?.forceRefresh === true
    const now = Date.now()

    if (!forceRefresh && usersDropdownForChatsCache && usersDropdownForChatsCacheExpiresAt > now) {
        return usersDropdownForChatsCache
    }

    if (!forceRefresh && usersDropdownForChatsRequest) {
        return usersDropdownForChatsRequest
    }

    usersDropdownForChatsRequest = apiClient
        .get('/user/getlistdropdownForChats')
        .then((response) => {
            usersDropdownForChatsCache = response.data
            usersDropdownForChatsCacheExpiresAt = Date.now() + USERS_DROPDOWN_FOR_CHATS_CACHE_TTL_MS
            return response.data
        })
        .finally(() => {
            usersDropdownForChatsRequest = null
        })

    return usersDropdownForChatsRequest
}
