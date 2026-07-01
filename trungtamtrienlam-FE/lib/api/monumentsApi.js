import apiClient from '@/utils/apiClient'

export async function fetchMonument(params = {}) {
    const response = await apiClient.get('/Monument/GetList', { params })
    return response.data
}

export async function createMonument(body) {
    const response = await apiClient.post('/Monument/Create', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
    })
    return response.data
}

export async function updateMonument(body) {
    const response = await apiClient.put('/Monument/Update', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
    })
    return response.data
}

export async function deleteMonument(params = {}) {
    const response = await apiClient.delete('/Monument/Delete', { params })
    return response.data
}

export async function getMonument(params = {}) {
    const response = await apiClient.get('/Monument/Get', { params })
    return response.data
}

export async function requestApprovalMonument({ id }) {
    const response = await apiClient.put(`/Monument/Request/${id}`)
    return response.data
}

export async function redoMonument(body) {
    const response = await apiClient.put('/Monument/Redo', body)
    return response.data
}

export async function verifyMonument({ id }) {
    const response = await apiClient.put(`/Monument/Verify/${id}`)
    return response.data
}

export async function notVerifyMonument(body) {
    const response = await apiClient.put('/Monument/Refuse', body)
    return response.data
}

export async function publishMonument({ id }) {
    const response = await apiClient.put(`/Monument/Publish/${id}`)
    return response.data
}