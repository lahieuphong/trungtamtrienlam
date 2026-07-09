class ConfigConstants {
    static localstorageTokenKey = 'authToken'
    static localstorageUserInfoKey = 'userInfo'
    static localstorageRefreshTokenKey = 'refreshToken'
    static localstorageWebPushNotificationKey = 'webPushNotification'

    static extensionPng = '.png'
    static extensionJpg = '.jpg'
    static extensionJpeg = '.jpeg'
    static extensionImages = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.jfif', '.svg', '.tif', '.tiff', '.ico', '.avif', '.heic', '.heif', '.apng', '.arw', '.dng']
    static extensionImageSpecials = ['.arw', '.dng']
    static extensionVideos = ['.m4a', '.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv', '.mpeg', '.mpg']
    static extensionAudio = ['.m4a', '.mp3', '.wav', '.ogg', '.flac', '.aac', '.wma']
    static extensionDocuments = ['.pdf', '.docx', '.txt', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.odt', '.ods', '.odp']
    static extension3DModels = ['.stl', '.obj', '.fbx', '.gltf', '.glb']
    static extensionDocxDocuments = ['.docx', '.pdf']
    static extensionDocDocuments = ['.doc', '.odt']
    static extensionExcelxDocuments = ['.xlsx']
    static extensionExcelDocuments = ['.xls', '.ods']
    static extensionPowerPointxDocuments = ['.pptx']
    static extensionPowerPointDocuments = ['.ppt', '.odp']
    static extensionTxtDocuments = ['.txt', '.md', '.csv']
    static extensionZip = ['.zip', '.rar', '.7z', '.tar', '.gz']

    static maxSizeImage = 100
    static maxSizeVideo = 1000
    static maxSizeAudio = 100
    static maxSizeDocument = 100
    static maxSize3DModel = 1000
}

class OnlyOfficeConstants {
    static fileTypes = {
        pptx: 'pptx',
        ppt: 'ppt',
        xls: 'xls',
        xlsx: 'xlsx',
        docx: 'docx',
        doc: 'doc',
        txt: 'txt'
    }

    static documentTypes = {
        cell: 'cell',
        word: 'word',
        slide: 'slide'
    }

    static modes = {
        edit: 'edit',
        view: 'view'
    }
}

class PushNotificationConstants {
    static vapidKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || ''
}

export { ConfigConstants, OnlyOfficeConstants, PushNotificationConstants }
