class DataConstants {
  static sorts = [
    { value: 2, label: 'Từ A-Z' },
    { value: 3, label: 'Từ Z-A' },
    { value: 0, label: 'Thời gian thêm vào mới nhất' },
    { value: 1, label: 'Thời gian thêm vào cũ nhất' }
  ]

  static passwordMaskDefault = '********'
}

class FolderConstants {
  static downloadTypes = {
    single: 0,
    zip: 1
  }

  static typeShares = {
    self: 0,
    share: 1,
    shared: 2,
    trash: 3,
    storageServer: 4
  }

  static types = {
    audio: 0,
    image: 1,
    video: 2,
    document: 3,
    model3D: 4,
    other: 5,
    all: 6
  }

  static typeRoleShares = {
    all: 0,
    object: 1
  }

  static shareStatuses = {
    disable: 0,
    enable: 1
  }

  static viewTypes = {
    addFileShareFolder: 0,
    createFileOther: 1,
    shareFolder: 2,
    move: 3,
    copy: 4,
    trash: 5,
    storageServer: 6
  }

  static typeRoleShareList = [
    {
      value: FolderConstants.typeRoleShares.all,
      label: 'Tất cả'
    },
    {
      value: FolderConstants.typeRoleShares.object,
      label: 'Đối tượng'
    }
  ]

  static views = {
    grid: 0,
    list: 1
  }

  static refTypes = {
    monumentPrivate: 0
  }
}

class FileConstants {
  static viewTypes = {
    addFileShareFolder: 0,
    trash: 1,
    self: 2
  }

  static riskRecoveryStatuses = {
    yes: '01',
    notYet: '02'
  }

  static refTypes = {
    monumentPrivate: 0
  }
}

class FolderRoleConstants {
  static types = {
    department: 0,
    user: 1
  }
}

class FunctionConstants {
  static mediaAudio = 'Media-audio'
  static mediaImages = 'Media-images'
  static media = 'Media'
  static mediaVideos = 'Media-videos'
  static mediaDocuments = 'Media-documents'
  static media3d = 'Media-3d'
  static mediaShareFolder = 'Media-share-foler'
  static mediaTrash = 'Media-trash'
  static monument = 'Monument'
  static permission = 'Permission'
  static calendar = 'Calendar'
  static task = 'Task'
  static staff = 'Staff'
  static settings = 'Settings'
  static internal = 'internal'
  static pendingIssuance = 'pendingIssuance'
  static degital = 'degital'
  static ratings = 'Ratings'
  static criterias = 'Criterias'
  static awards = 'Awards'
  static settingRankings = 'Setting-rankings'
  static settingCriterias = 'Setting-criterias'
  static settingAwards = 'Setting-awards'
  static rankings = 'Rankings'
  static wordprocessing = 'wordprocessing'
  static formmanagement = 'formmanagement'
  static MonumentPrivate = 'Monument-Private'
  static objectSideBars = {
    'Media-audio': {
      folderCount: 'countMusic'
    },
    'Media-images': {
      folderCount: 'countImage'
    },
    'Media-videos': {
      folderCount: 'countVideo'
    },
    'Media-documents': {
      folderCount: 'countDocument'
    },
    'Media-3d': {
      folderCount: 'count3D'
    },
    'Media-share-foler': {
      folderCount: 'countShare'
    },
    'Media-trash': {
      folderCount: 'countTrash'
    }
  }
}

class ActionConstants {
  static changePassword = 'ChangePassword'
  static view = 'View'
  static edit = 'Edit'
  static refuse = 'Refuse'
  static add = 'Add'
  static delete = 'Delete'
  static verify = 'Verify'
  static dowload = 'Download'
}

class MonumentProfileConstants {
  static statusNames = {
    0: 'Soạn thảo',
    1: ' Chờ duyệt',
    2: 'Đã duyệt',
    3: 'Không duyệt',
    4: 'Trả lại'
  }

  static types = {
    public: 0,
    private: 1
  }

  static levelObjects = {
    specialNation: 0,
    nation: 1,
    city: 2
  }

  static ratings = [
    {
      label: 'Cấp quốc gia đặc biệt',
      value: MonumentProfileConstants.levelObjects.specialNation
    },
    {
      label: 'Cấp quốc gia',
      value: MonumentProfileConstants.levelObjects.nation
    },
    {
      label: 'Cấp thành phố',
      value: MonumentProfileConstants.levelObjects.city
    }
  ];

  static ratingObjects = {
    0: 'Cấp quốc gia đặc biệt',
    1: 'Cấp quốc gia',
    2: 'Cấp thành phố'
  }

  static priorityModeObjects = {
    always: 0,
    appearByDatePosted: 1,
    hidden: 2
  }

  static statuses = {
    draft: 0,
    pendingApproval: 1,
    approved: 2,
    notApproved: 3,
    redo: 4,
    published: 5
  }

  static levelNames = {
    0: 'Cấp quốc gia đặc biệt',
    1: 'Cấp quốc gia',
    2: 'Cấp thành phố'
  }
}

class MonumentSectionConstants {
  static types = {
    image: 0,
    imageContent: 1,
    content: 2,
    contentImage: 3
  }
}

class MonumentFileConstants {
  static modes = {
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
    fileRating: 10
  }
}

class ShareLinkConstants {
  static types = {
    folder: 0,
    file: 1
  }

  static statuses = {
    disabled: 0,
    enabled: 1
  }
}

class NotificationsConstants {
  static types = {
    types: 1,
    leave: 2,
    calendar: 3,
    document: 4,
    storage: 5,
    rating: 6,
    maintenance: 7,
    monument: 8,
    calendarVersion2: 9,
    chat: 10,
    form: 11
  }

  static routeTriggerNotificationReads = [
    { route: '/Folder/GetList', refId: 'parentId' },
    { route: '/Task/Detail', refId: 'id' },
    { route: '/FormHandding/GetDetail', refId: 'ID' },
    { route: '/Document/getDocumentDetails', refId: 'ID' },
    { route: '/Chat/GetDetail', refId: 'chatID' }

  ]
}

export {
  FolderConstants,
  ActionConstants,
  FunctionConstants,
  DataConstants,
  FolderRoleConstants,
  FileConstants,
  MonumentProfileConstants,
  MonumentSectionConstants,
  MonumentFileConstants,
  ShareLinkConstants,
  NotificationsConstants
}
