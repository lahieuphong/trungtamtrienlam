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
