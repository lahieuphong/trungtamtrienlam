class MessageConstants {
    static types = {
        All: 0,
        Task: 1,
        Leave: 2,
        Calendar: 9,
        Document: 4,
        Archive: 5,
        Rating: 6,
        Monument: 8,
        CalendarVersion2: 9,
        System: 7,
        Chat: 10,
        Form: 11
    }
}

function convertTabName(tabName) {
    switch (tabName) {
        case 'All': return 'Tất cả'
        case 'Task': return 'Công việc'
        case 'Calendar': return 'Lịch'
        case 'Leave': return 'Biểu mẫu'
        case 'Document': return 'Văn bản'
        case 'Archive': return 'Kho lưu trữ'
        case 'Rating': return 'Đánh giá xếp hạng'
        case 'Monument': return 'Hồ sơ di tích'
        case 'CalendarVersion2': return 'Lịch đặc biệt'
        case 'System': return 'Hệ thống'
        case 'Chat': return 'Tin nhắn'
        case 'Form': return 'Đơn từ'
        default: return tabName
    }
}

export { MessageConstants, convertTabName }
