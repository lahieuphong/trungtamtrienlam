class ConfigConstants {
    static localstorageTokenKey = 'authToken'
    static localstorageUserInfoKey = 'userInfo'
    static localstorageRefreshTokenKey = 'refreshToken'

    static extensionImages = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.jfif', '.svg', '.tiff']
    static extensionVideos = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv']
    static extensionAudio = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a']
    static extensionDocuments = ['.pdf', '.docx', '.txt', '.xlsx', '.pptx', '.doc', '.xls', '.ppt']
    static extension3DModels = ['.stl', '.obj', '.fbx', '.gltf', '.glb']

    static maxSizeImage = 100
    static maxSizeVideo = 1000
    static maxSizeAudio = 100
    static maxSizeDocument = 100
    static maxSize3DModel = 1000
}

export { ConfigConstants }
