class ApiConstants {
    static baseUrl = process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
        : 'http://localhost:8000/api'

    static cdnUrl = process.env.NEXT_PUBLIC_CDN_URL
        ? process.env.NEXT_PUBLIC_CDN_URL.replace(/\/$/, '')
        : 'http://localhost:8000'

    static onlyOfficeServerUrl = process.env.NEXT_PUBLIC_ONLYOFFICE_SERVER_URL || 'https://onlyoffice.hongvan.net'
    static onlyOfficeJwtToken = process.env.NEXT_PUBLIC_ONLYOFFICE_JWT_TOKEN || ''
    static onlyOfficeScript = `${ApiConstants.onlyOfficeServerUrl}/web-apps/apps/api/documents/api.js`
}

export { ApiConstants }
