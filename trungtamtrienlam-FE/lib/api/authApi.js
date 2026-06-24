import apiClient from '@/utils/apiClient'

const authApi = {
    login: (username, password) =>
        apiClient.post('/auth/login/', { username, password }),

    logout: (refresh) =>
        apiClient.post('/auth/logout/', { refresh }).catch(() => {}),

    refreshToken: (refresh) =>
        apiClient.post('/auth/refresh/', { refresh }),

    forgotPassword: (email) =>
        apiClient.post('/auth/forgot-password/', { email }),

    resetPassword: (token, email, password) =>
        apiClient.post('/auth/reset-password/', { token, email, password }),

    me: () =>
        apiClient.get('/auth/users/me/'),

    changePassword: (userId, oldPassword, newPassword) =>
        apiClient.post(`/auth/users/${userId}/change-password/`, { old_password: oldPassword, new_password: newPassword }),
}

export default authApi
