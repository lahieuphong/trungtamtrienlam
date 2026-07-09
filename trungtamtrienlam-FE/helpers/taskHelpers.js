import { TaskConstants } from "@/constants/taskContants";

const checkActionTask = (action, listActions) => {

  return listActions.includes(action);
};

const getStatusColors = (status) => {
  const statusColors = {
    0: { label: "Đang tạo", color: "text-gray-500", bg: "bg-gray-500" },
    1: { label: "Chưa nhận", color: "text-green-600", bg: "bg-green-600" },
    2: { label: "Đang tiến hành", color: "text-blue-600", bg: "bg-blue-600" },
    3: { label: "Chờ duyệt", color: "text-blue-400", bg: "bg-blue-400" },
    4: { label: "Đã hoàn thành", color: "text-green-600", bg: "bg-green-600" },
    5: { label: "Tạm ngừng", color: "text-red-600", bg: "bg-red-600" },
    6: { label: "Đã huỷ", color: "text-gray-800", bg: "bg-gray-800" },
    7: { label: "Đã thu hồi", color: "text-orange-700", bg: "bg-orange-700" },
    40: { label: "Đã hoàn thành", color: "text-red-600", bg: "bg-red-600" },
  }

  // const statusColors = {
  //   0: { label: "Đang tạo", color: "text-[#BFBFBF]", bg: "bg-[#BFBFBF]" },
  //   1: { label: "Chưa nhận", color: "text-[#006D75]", bg: "bg-[#006D75]" },
  //   2: { label: "Đang tiến hành", color: "text-[#0A68FF]", bg: "bg-[#0A68FF]" },
  //   3: { label: "Chờ duyệt", color: "text-blue-400 ", bg: "bg-blue-400" },
  //   4: { label: "Đã hoàn thành", color: "text-[#00AB56] ", bg: "bg-[#00AB56]" },
  //   5: { label: "Tạm ngừng", color: "text-[#FF424E]", bg: "bg-[#FF424E]" },
  //   6: { label: "Đã huỷ", color: "text-[#1F1F1F]", bg: "bg-[#1F1F1F]" },
  //   7: { label: "Đã thu hồi", color: "text-[#993300]", bg: "bg-[#993300]" },
  // }

  return statusColors[status] || { label: "Không xác định", color: "text-gray-500", bg: "bg-gray-200" }
}

const getStatusTaskDocumentColors = (status) => {
  const statusColors = {
    0: { label: "Soạn thảo", color: "text-gray-500", bg: "bg-gray-200", bgRound: "bg-gray-500" },
    1: { label: "Trình duyệt", color: "text-[#2F54EB]", bg: "bg-[#F0F5FF]", bgRound: "bg-[#2F54EB]" },
    2: { label: "Đã duyệt", color: "text-[#135200]", bg: "bg-[#D9F7BE]", bgRound: "bg-[#135200]" },
    3: { label: "Đã ban hành", color: "text-[#135200]", bg: "bg-[#D9F7BE]", bgRound: "bg-[#135200]" },
    4: { label: "Đã hủy", color: "text-red-600", bg: "bg-red-400", bgRound: "bg-red-600" },
    5: { label: "Trình ký", color: "text-green-600", bg: "bg-green-400", bgRound: "bg-green-600" },
  }

  return statusColors[status] || { label: "Không xác định", color: "text-gray-500", bg: "bg-gray-200" }
}

const getStatusTaskConfirmColors = (status) => {
  const statusColors = {
    0: { label: "Chờ duyệt", color: "text-blue-400", bg: "bg-blue-400", bgRound: "bg-[#2F54EB]" },
    1: { label: "Không duyệt", color: "text-red-500", bg: "bg-red-500", bgRound: "bg-[#2F54EB]" },
    2: { label: "Trả lại", color: "text-yellow-500", bg: "bg-yellow-500", bgRound: "bg-[#135200]" },
    3: { label: "Duyệt", color: "text-blue-500", bg: "bg-blue-500", bgRound: "bg-[#135200]" }
  }

  return statusColors[status] || { label: "Không xác định", color: "text-gray-500", bg: "bg-gray-200" }
}

const handleChangeLabel = (label) => {
  switch (label) {
    case "All":
      return "Tất cả"
    case "Creating":
      return "Đang tạo"
    case "NotReceived":
      return "Chưa nhận"
    case "InProgress":
      return "Đang tiến hành"
    case "PendingApproval":
      return "Chờ duyệt"
    case "Completed":
      return "Đã hoàn thành"
    case "Suspended":
      return "Tạm ngưng"
    case "Cancelled":
      return "Đã hủy"
    case "Extend":
      return "Xin gia hạn"
    case "Revoke":
      return "Thu hồi"
    default:
      return label
  }
}

export const shouldShowDropdown = (isReceived, allowedActions) => {
  const recvActions = ["CanReceive", "CanExtend", "CanSeekApproval"];
  const creatorActions = [
    "CanEdit",
    "CanAbort",
    "CanRevoke",
    "CanDelete",
    "CanAssign",
    "CanConfirm",
  ];

  return (isReceived ? recvActions : creatorActions)
    .some((a) => checkActionTask(TaskConstants.actions[a], allowedActions));
};

export {
  checkActionTask,
  getStatusColors,
  handleChangeLabel,
  getStatusTaskDocumentColors,
  getStatusTaskConfirmColors
};
