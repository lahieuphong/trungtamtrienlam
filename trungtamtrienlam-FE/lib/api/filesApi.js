import axiosInstance, { axiosCloudCDNInstance, axiosInstanceStorageServerCloud } from "./axiosConfig";
import ThreadHelpers from "../../helpers/threadHelpers";

// Tạo tệp tin
export const createFile = async (body) => {
  try {
    return (
      await axiosInstance.post("/File/Create", body, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
    ).data;
  } catch (error) {
    throw error;
  }
};

// Sửa tệp tin
export const updateFile = async (body) => {
  try {
    return (
      await axiosInstance.put("/File/Update", body, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
    ).data;
  } catch (error) {
    throw error;
  }
};

// Ghim tệp tin
export const pinFile = async (body) => {
  try {
    return (await axiosInstance.put("/File/Pin", body)).data;
  } catch (error) {
    throw error;
  }
};

// Lấy chi tiết tệp tin
export const detailFile = async (params = { id }) => {
  try {
    return (await axiosInstance.get("/File/Detail", { params })).data;
  } catch (error) {
    throw error;
  }
};

// Di chuyển tệp tin
export const transferFile = async (body) => {
  try {
    return (await axiosInstance.put("/File/Transfer", body)).data;
  } catch (error) {
    throw error;
  }
};

// Tải tệp tin
export const downloadFile = async (body) => {
  try {
    return (await axiosCloudCDNInstance.post("/File/Download", body, {
      responseType: 'blob',
      headers: {
        "Content-Type": "application/json",
      }
    })).data;
  } catch (error) {
    throw error;
  }
};

// Thêm tệp tin vào thư mục chia sẻ
export const addFileToShareFolder = async (body) => {
  try {
    return (
      await axiosInstance.post("/File/AddFileToShareFolder", body, {

      })
    ).data;
  } catch (error) {
    throw error;
  }
};


// Tải tệp tin lớn
export const downloadFileChunk = async (body, rangeStart, rangeEnd) => {
  try {
    let res = null;

    if (body.isStorageServer) {
      res = await axiosInstanceStorageServerCloud.post("/File/DownloadChunk", body, {
        responseType: 'blob',
        headers: {
          "Content-Type": "application/json",
          "Content-Range": `bytes=${rangeStart}-${rangeEnd}`
        }
      });
    } else {
      res = await axiosCloudCDNInstance.post("/File/DownloadChunk", body, {
        responseType: 'blob',
        headers: {
          "Content-Type": "application/json",
          "Content-Range": `bytes=${rangeStart}-${rangeEnd}`
        }
      });
    }

    return {
      data: res.data,
      totalFileSize: res.headers['file-size'] ? parseInt(res.headers['file-size'], 10) : 0,
    };
  } catch (error) {
    throw error;
  }
};

export const getSizeFile = async (body) => {
  try {
    let res = null;

    if (body.isStorageServer) {
      res = await axiosInstanceStorageServerCloud.post("/File/GetSize", body, {

      });
    } else {
      res = await axiosCloudCDNInstance.post("/File/GetSize", body, {

      });
    }

    const data = res.data;

    return data;
  } catch (error) {
    return {
      status: 400
    }
  }
}

// Tải tệp tin lớn
export const downloadFileLargeWithProgress = (body, onProgress, onIsStop) => {
  return new Promise(async (resolve, reject) => {
    let rangeStart = 0;
    const chunkSize = 1024 * 1024; // 1 MB mỗi lần tải
    let fileParts = [];
    let downloadedFile = 0;
    let totalFileSize = 0;
    let zipId = ((body || {}).zip || {}).zipId;

    const responseSizeFile = await getSizeFile(body);

    if (responseSizeFile.status != 200 || (responseSizeFile.data || {}).size <= 0) {
      return reject({
        status: -1,
        message: responseSizeFile.message
      });
    }

    totalFileSize = (responseSizeFile.data || {}).size;
    try {
      while (true) {
        const rangeEnd = Math.min(rangeStart + chunkSize - 1, totalFileSize - 1);

        // Tải phần của file
        const res = await downloadFileChunk({ ...body, zipId }, rangeStart, rangeEnd);

        const part = res.data;

        if (totalFileSize <= 0) {
          totalFileSize = parseInt(res.totalFileSize, 10);
        }

        // Lưu phần đã tải vào mảng
        fileParts.push(part);

        downloadedFile += part.size;

        if (onProgress) {
          onProgress({
            loaded: rangeStart,
            total: totalFileSize
          });
        }

        rangeStart = rangeEnd + 1; // quan trọng: cập nhật chính xác

        // Kiểm tra nếu phần dữ liệu đã tải là rỗng (không còn phần nào để tải)
        if (totalFileSize > 0 && rangeStart >= totalFileSize) {
          break;
        }

        while (onIsStop ? onIsStop() : false) {
          await ThreadHelpers.sleep(1000);
        }
      }

      // Ghép các phần của file lại nếu cần
      // Ví dụ, bạn có thể tạo một URL hoặc Blob từ các phần đã tải
      const fullFile = new Blob(fileParts);

      resolve(fullFile); // Hoặc bạn có thể tạo URL cho file và mở trong trình duyệt
    } catch (error) {
      console.error("Error downloading large file:", error);

      reject(error);
    }
  });
};

// Lấy danh sách tệp tin ở thùng rác
export const fetchFileTrash = async (params = { page, pageSize, type, sort, keyword }) => {
  try {

    return (await axiosInstance.get("/File/GetListTrash", { params })).data;
  } catch (error) {
    throw error;
  }
}

// Khôi phục tệp tin
export const restoreFile = async (body) => {
  try {
    return (await axiosInstance.put("/File/Restore", body)).data;
  } catch (error) {
    throw error;
  }
}

// Xóa tập tin
export const deleteFile = async (body) => {
  try {

    return (await axiosInstance.delete("/File/Delete", { data: body })).data;
  } catch (error) {
    throw error;
  }
}

// Nhân bản tệp tin
export const copyFile = async (body) => {
  try {
    return (await axiosInstance.put("/File/Copy", body)).data;
  } catch (error) {
    throw error;
  }
};
