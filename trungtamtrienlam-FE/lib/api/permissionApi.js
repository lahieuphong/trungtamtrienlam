import apiClient from '@/utils/apiClient'

export const fetchPermission = async (params = { departmentID: '', roleID: '' }) => {
    try {
        return (await apiClient.get('/auth/permissions/matrix/', { params })).data
    } catch (error) {
        throw error
    }
}

export const fetchPermissionByUserLogin = async () => {
    try {
        return (await apiClient.get('/auth/permissions/by-user/')).data
    } catch (error) {
        throw error
    }
}

export const updatePermission = async (payload = { departmentID: '', roleID: '', action: '', functionID: '' }) => {
    try {
        return (await apiClient.post('/auth/permissions/toggle/', payload)).data
    } catch (error) {
        throw error
    }
}

export const clonePermission = async (payload = {
    newDepartmentID: '',
    newRoleID: '',
    oldDepartmentID: '',
    oldRoleID: '',
}) => {
    try {
        return (await apiClient.post('/auth/permissions/clone/', payload)).data
    } catch (error) {
        throw error
    }
}
