import { ConfigConstants } from '../constants/configConstants'

class FileHelpers {
  static getFileName (fileName) {
    return (fileName || '').split('/').pop().split('?')[0]
  }

  static renderDisplayKB (size) {
    if (size < 1000) {
      return `${size}KB`
    }

    return `${this.convertKBToMB(size)}MB`
  }

  static convertByteToMB (size) {
    return (size / 1024 / 1024).toFixed(2)
  }

  static convertByteToKB (size) {
    return (size / 1024).toFixed(2)
  }

  static convertKBToMB (size) {
    return (size / 1024).toFixed(2)
  }

  static checkValidFileImage (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionImages.find(p => (p ?? "").toLowerCase() == extesionFile)
      ? true
      : false
  }

  static checkValidFileAudio (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionAudio.find(p => p == extesionFile)
      ? true
      : false
  }

  static checkValidFileVideo (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionVideos.find(p => p == extesionFile)
      ? true
      : false
  }

  static checkValidFileDocument (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionDocuments.find(p => p == extesionFile)
      ? true
      : false
  }

  static checkValidFile3D (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extension3DModels.find(p => p == extesionFile)
      ? true
      : false
  }

  static checkValidFileSizeImage (size) {
    const sizeMB = this.convertByteToMB(size)

    return ConfigConstants.maxSizeImage >= sizeMB ? true : false
  }

  static checkValidFileSizeAudio (size) {
    const sizeMB = this.convertByteToMB(size)

    return ConfigConstants.maxSizeAudio >= sizeMB ? true : false
  }

  static checkValidFileSizeVideo (size) {
    const sizeMB = this.convertByteToMB(size)

    return ConfigConstants.maxSizeVideo >= sizeMB ? true : false
  }

  static checkValidFileSizeDocument (size) {
    const sizeMB = this.convertByteToMB(size)

    return ConfigConstants.maxSizeDocument >= sizeMB ? true : false
  }

  static checkValidFileSize3D (size) {
    const sizeMB = this.convertByteToMB(size)

    return ConfigConstants.maxSize3DModel >= sizeMB ? true : false
  }

  static checkValidFileZip (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionZip.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileImage (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionImages.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileImageSpecial(fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionImageSpecials.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileAudio (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionAudio.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileVideo (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionVideos.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileDocument (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionDocuments.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFile3D (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extension3DModels.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileDocDocument (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionDocDocuments.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileDocxDocument (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionDocxDocuments.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileExcelDocument (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionExcelDocuments.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileExcelxDocument (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionExcelxDocuments.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFileTxtDocument (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionTxtDocuments.find(p => p == extesionFile)
      ? true
      : false
  }

  static isFilePowerPointDocument (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionPowerPointDocuments.find(
      p => p == extesionFile
    )
      ? true
      : false
  }

  static isFilePowerPointxDocument (fileName) {
    const extesionFile = '.' + (fileName || '').split('.').pop().toLowerCase()

    return ConfigConstants.extensionExcelxDocuments.find(p => p == extesionFile)
      ? true
      : false
  }

  static getExtension (fileName) {
    return (fileName || '').split('.').pop().toLowerCase()
  }

  static isFilePdf (fileName) {
    const extension = this.getExtension(fileName)
    return extension === 'pdf'
  }

  static isFileUpload (file) {
    return file instanceof File // hoặc file instanceof Blob
  }
}

export { FileHelpers }
