import { se } from 'date-fns/locale'
import axiosInstance, { axiosCloudCDNInstance } from './axiosConfig'

// Lấy danh mục văn bản
export const getDocumentCategories = async () => {
  try {
    return (await axiosInstance.get('/Document/GetDocumentCategories')).data
  } catch (error) {
    throw error
  }
}

// tạo văn bản
export const createDocument = async data => {
  try {
    const response = await axiosInstance.post('/TaskDocument/Create', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

// tạo văn bản
export const updateDocument = async data => {
  try {
    const response = await axiosInstance.post('/TaskDocument/Update', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

// tạo chữ ký tay
export const createSignature = async data => {
  try {
    const response = await axiosInstance.post(
      '/Document/CreateSignature',
      data,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data
  } catch (error) {
    throw error
  }
}

//lấy chữ ký
export const getSignature = async staffID => {
  try {
    return (
      await axiosInstance.get('/Document/getSignature', { params: { staffID } })
    ).data
  } catch (error) {
    throw error
  }
}

// validate chữ ký
export const validateSignature = async data => {
  try {
    const response = await axiosInstance.post(
      '/Document/validateSignature',
      data,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data
  } catch (error) {
    throw error
  }
}

// so sánh chữ ký nhân viên
export const compareSignStaff = async (
  pathFile,
  staffId,
  isPrivate = false
) => {
  try {
    const response = await axiosCloudCDNInstance.get('/File/CompareSignStaff', {
      params: {
        pathFile,
        staffId,
        isPrivate
      }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

// so sánh chữ ký nhân viên
export const compareWithStaff = async (
  pathFile,
  staffId,
  isPrivate = false
) => {
  try {
    const response = await axiosCloudCDNInstance.get('/File/CompareWithStaff', {
      params: {
        pathFile,
        staffId,
        isPrivate
      }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

// so sánh con dấu
export const compareStamp = async (pathFile, staffId, isPrivate = false) => {
  try {
    const response = await axiosCloudCDNInstance.get(
      '/File/CompareStampStaff',
      {
        params: {
          pathFile,
          staffId,
          isPrivate
        }
      }
    )
    return response.data
  } catch (error) {
    throw error
  }
}

//lấy văn bản chờ ban hành
export const getPendingDocuments = async (tab, searchKey, orderBy) => {
  try {
    return (
      await axiosInstance.get('/Document/getPendingDocuments', {
        params: { tab, searchKey, orderBy }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//lấy chi tiết văn bản
export const getDocumentDetails = async ID => {
  try {
    return (
      await axiosInstance.get('/Document/getDocumentDetails', {
        params: { ID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//lưu văn bản đã ký
export const saveSignedDocument = async data => {
  try {
    const response = await axiosInstance.post(
      '/Document/saveSignedDocument',
      data,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data
  } catch (error) {
    throw error
  }
}

//lấy tổng số văn bản
export const getDocumentCount = async () => {
  try {
    return (await axiosInstance.get('/Document/getDocumentCount')).data
  } catch (error) {
    throw error
  }
}

export const getDocument = async ID => {
  try {
    return (
      await axiosInstance.get('/Document/getDocument', { params: { ID } })
    ).data
  } catch (error) {
    throw error
  }
}

//trả làm lại
export const payAgain = async body => {
  try {
    return (await axiosInstance.post('/Document/payAgain', body)).data
  } catch (error) {
    throw error
  }
}

//lấy văn bản nội bộ
export const getInternalDocuments = async (departmentID, statusTypes, fromTime, toTime, searchKey, orderBy) => {
  try {
    return (
      await axiosInstance.get('/Document/getInternalDocuments', {
        params: { departmentID, statusTypes, fromTime, toTime, searchKey, orderBy }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//lấy văn bản đi đến theo phòng ban
export const getDepartmentDocuments = async (departmentID, tab, searchKey, orderBy) => {
  try {
    return (
      await axiosInstance.get('/Document/getDepartmentDocuments', {
        params: { departmentID, tab, searchKey, orderBy }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//lấy departmentID theo userID
export const getDepartmentIDByUserID = async staffID => {
  try {
    return (
      await axiosInstance.get('/Document/getDepartmentIDByUserID', {
        params: { staffID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//lấy tổng số văn bản đi/đến
export const getTotalDocumentGoandArrives = async departmentID => {
  try {
    return (
      await axiosInstance.get('/Document/getTotalDocumentGoandArrives', {
        params: { departmentID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//lấy tổng số văn bản nội bộ
export const getTotalInternalDocuments = async departmentID => {
  try {
    return (
      await axiosInstance.get('/Document/getTotalInternalDocuments', {
        params: { departmentID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//trình duyệt
export const submitted = async ID => {
  try {
    return (await axiosInstance.get('/Document/submitted', { params: { ID } }))
      .data
  } catch (error) {
    throw error
  }
}

//Duyệt
export const approval = async ID => {
  try {
    return (await axiosInstance.get('/Document/approval', { params: { ID } }))
      .data
  } catch (error) {
    throw error
  }
}

//Trình ký
export const signature = async ID => {
  try {
    return (await axiosInstance.get('/Document/signature', { params: { ID } }))
      .data
  } catch (error) {
    throw error
  }
}

//Không duyệt văn bản
export const cancel = async ID => {
  try {
    return (await axiosInstance.get('/Document/cancel', { params: { ID } }))
      .data
  } catch (error) {
    throw error
  }
}

//lấy lịch sử document
export const getDocumentHistory = async ID => {
  try {
    return (
      await axiosInstance.get('/Document/getDocumentHistory', {
        params: { ID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//lấy taskID
export const getTaskID = async ID => {
  try {
    return (
      await axiosInstance.get('/Document/getTaskID', {
        params: { ID }
      })
    ).data
  } catch (error) {
    throw error
  }
}

//lấy file thêm vào kho lưu trữ
export const getFiles = async ID => {
  try {
    return (await axiosInstance.get('/Document/getFiles', { params: { ID } }))
      .data
  } catch (error) {
    throw error
  }
}

//Thêm file vào kho lưu trữ
export const addFileToArchive = async formData => {
  try {
    const response = await axiosInstance.post('/Document/addFileToArchive', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    if (response.status === 200) {
      return response.data
    } else {
      throw new Error('Failed to archive file')
    }
  } catch (error) {
    throw error
  }
}


//Xóa chữ ký tay
export const deleteSignatureHand = async ID => {
  try {
    return (await axiosInstance.delete('/Document/deleteSignatureHand', { params: { ID } }))
      .data
  } catch (error) {
    throw error
  }
}

