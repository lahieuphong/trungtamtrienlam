class ChatConstants {
  static Type = {
    PRIVATE: 1,
    GROUP: 2
  }
}

class ChatUserConstants {
  static Role = {
    Leader: 1, //trưởng nhóm
    ViceLeader: 2, //Phó nhóm
    Member: 3 // Thành viên
  }
}

class ChatMessageConstants {
  static MessageType = {
    Text: 1,
    ImageOrVideo: 2,
    Link: 3,
    File: 4
  }
}

class ChatAwaitConfirmConstants {
  static Status = {
    Waiting: 1, // Đang chờ
    Accepted: 2, // Đã chấp nhận
    Rejected: 3 // Đã từ chối
  }
}

class EventType {
  static Type = {
    Note: 1,
    Vote: 2,
    Remind: 3
  }
}

class ChatRemindConstants {
  static RepeatType = {
    NoRepeat: 0,
    Daily: 1,
    Weekly: 2,
    Monthly: 3
  }
}

export {
  ChatConstants,
  ChatUserConstants,
  ChatMessageConstants,
  ChatAwaitConfirmConstants,
  EventType,
  ChatRemindConstants
}
