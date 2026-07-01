export const MonumentProfileConstants = {
    types: {
        public: 0,
        private: 1,
    },
    statuses: {
        draft: 0,
        pendingApproval: 1,
        approved: 2,
        notApproved: 3,
        redo: 4,
        published: 5,
    },
    statusNames: {
        0: 'Soạn thảo',
        1: 'Chờ duyệt',
        2: 'Đã duyệt',
        3: 'Không duyệt',
        4: 'Trả lại',
        5: 'Đã xuất bản',
    },
    levelObjects: {
        specialNation: 0,
        nation: 1,
        city: 2,
    },
    ratingOptions: [
        { label: 'Cấp quốc gia đặc biệt', value: 0 },
        { label: 'Cấp quốc gia', value: 1 },
        { label: 'Cấp thành phố', value: 2 },
    ],
    priorityModeOptions: [
        { label: 'Luôn ưu tiên', value: 0 },
        { label: 'Xuất hiện theo ngày đăng', value: 1 },
        { label: 'Ẩn', value: 2 },
    ],
    pendingLevelNames: {
        3: 'Trưởng phòng',
        2: 'Phó giám đốc',
        1: 'Giám đốc',
    },
}

export const MonumentSectionConstants = {
    types: {
        image: 0,
        imageContent: 1,
        content: 2,
        contentImage: 3,
    },
    options: [
        { label: '1 Đối tượng: Hình ảnh', value: 0 },
        { label: '2 Đối tượng: Hình ảnh - Đoạn văn', value: 1 },
        { label: '1 Đối tượng: Đoạn văn', value: 2 },
        { label: '2 Đối tượng: Đoạn văn - Hình ảnh', value: 3 },
    ],
}

export const MonumentFileConstants = {
    modes: {
        imageAvatar: 0,
        imageAvatar2: 1,
        imageObject: 2,
        imageDetail: 3,
        fileVideo: 4,
        fileModel3D: 5,
        fileStructure: 6,
        imageTech: 7,
        fileMap: 8,
        fileRecognitionDecision: 9,
        fileRating: 10,
    },
}