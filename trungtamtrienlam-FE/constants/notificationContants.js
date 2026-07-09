class MessageConstants {
    static types = {
        All: 0, // Tất cả
        Task: 1, // Công việc
        Leave: 2, // Đơn từ
        Calendar: 9, // Lịch
        Document: 4, // Văn bản
        Archive: 5, // Kho lưu trữ
        Rating: 6, // Đánh giá xếp hạng
        Monument: 8, // Hệ thống
        CalendarVersion2: 9, // Hệ thống
        System: 7, // Hệ thống
        Chat: 10, // Tin nhắn
        Form: 11 // Biểu mẫu
    };
}

function convertTabName(tabName) {
    switch (tabName) {
        case "All":
            return "Tất cả";
        case "Task":
            return "Công việc";
        case "Calendar":
            return "Lịch";
        case "Leave":
            return "Biểu mẫu";
        case "Document":
            return "Văn bản";
        case "Archive":
            return "Kho lưu trữ";
        case "Rating":
            return "Đánh giá xếp hạng";
        case "Monument":
            return "Hồ sơ di tích";
        case "CalendarVersion2":
            return "Lịch đặc biệt";
        case "System":
            return "Hệ thống";
        case "Chat":
            return "Tin nhắn";
        case "Form":
            return "Đơn từ";
        default:
            return tabName;
    }
};
export {
    MessageConstants, convertTabName
}