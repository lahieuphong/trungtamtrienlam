import apiClient from '@/utils/apiClient'

export const fetchUsers = async (params = { page: 1, pageSize: 15, keyword: '' }) => {
    try {
        return (await apiClient.get('/accounts/staff/getlist/', { params })).data
    } catch (error) {
        throw error
    }
}

export const fetchUserById = async (params = { id: '', isInfo: false }) => {
    try {
        return (await apiClient.get('/accounts/staff/getdetail/', { params })).data
    } catch (error) {
        throw error
    }
}

export const createUser = async (formData) => {
    try {
        return (await apiClient.post('/accounts/staff/create/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })).data
    } catch (error) {
        throw error
    }
}

export const updateUser = async (userId, formData) => {
    try {
        formData.append('id', userId)
        return (await apiClient.put('/accounts/staff/update/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })).data
    } catch (error) {
        throw error
    }
}

export const deleteUser = async (userId) => {
    try {
        return (await apiClient.delete(`/accounts/staff/delete/?id=${userId}`)).data
    } catch (error) {
        throw error
    }
}

export const resetUser = async (userId) => {
    try {
        return (await apiClient.get(`/accounts/staff/forgot-password/?id=${userId}`)).data
    } catch (error) {
        throw error
    }
}

export const changeUserPassword = async (userId, password) => {
    try {
        return (await apiClient.post('/accounts/staff/change-password/', { id: userId, password })).data
    } catch (error) {
        throw error
    }
}
