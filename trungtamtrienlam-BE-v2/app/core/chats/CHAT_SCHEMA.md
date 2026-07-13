# Chat schema mapping

Luồng chat của 185 tách dữ liệu thành các bảng nhỏ theo đúng trách nhiệm:

- `Chats`: thông tin cuộc trò chuyện, loại chat, avatar, metadata tin cuối.
- `ChatUsers`: thành viên trong chat, vai trò, trạng thái tắt thông báo.
- `ChatMessages`: nội dung tin nhắn, loại tin, reply, thu hồi, ghim, sự kiện.
- `ChatFiles` và `ChatLinks`: file/link đính kèm theo tin nhắn.
- `ChatSeen`: trạng thái đã đọc theo user và tin nhắn.
- `ChatPin`: chat được user ghim.
- `ChatAwaitConfirm`: yêu cầu tham gia nhóm chờ duyệt.
- `ChatNotes`: ghi chú trong chat.
- `ChatVotes`, `ChatVoteOptions`, `ChatVoteResult`: bình chọn, lựa chọn và kết quả vote.
- `ChatRemind`, `ChatRemindJobs`, `ChatRemindUsers`: nhắc hẹn, lịch chạy và người tham gia.

Django hiện tại giữ cùng kiểu tách trách nhiệm, nhưng dùng namespace bảng `aidi_managed_*` để không va vào các bảng legacy cũ:

| 185 table | Django model | Django table |
| --- | --- | --- |
| `Chats` | `core.chats.ManagedChat` | `aidi_managed_chats` |
| `ChatUsers` | `core.chats.ManagedChatUser` | `aidi_managed_chat_users` |
| `ChatMessages` | `core.chats.ManagedChatMessage` | `aidi_managed_chat_messages` |
| `ChatFiles` | `core.chats.ManagedChatFile` | `aidi_managed_chat_files` |
| `ChatLinks` | `core.chats.ManagedChatLink` | `aidi_managed_chat_links` |
| `ChatSeen` | `core.chats.ManagedChatSeen` | `aidi_managed_chat_seen` |
| `ChatPin` | `core.chats.ManagedChatPin` | `aidi_managed_chat_pins` |
| `ChatAwaitConfirm` | `core.chats.ManagedChatAwaitConfirm` | `aidi_managed_chat_await_confirms` |
| `ChatNotes` | `core.chat_notes.ManagedChatNote` | `aidi_managed_chat_notes` |
| `ChatVotes` | `core.chat_votes.ManagedChatVote` | `aidi_managed_chat_votes` |
| `ChatVoteOptions` | `core.chat_votes.ManagedChatVoteOption` | `aidi_managed_chat_vote_options` |
| `ChatVoteResult` | `core.chat_votes.ManagedChatVoteResult` | `aidi_managed_chat_vote_results` |
| `ChatRemind` | `core.chat_reminds.ManagedChatRemind` | `aidi_managed_chat_reminds` |
| `ChatRemindJobs` | `core.chat_reminds.ManagedChatRemindJob` | `aidi_managed_chat_remind_jobs` |
| `ChatRemindUsers` | `core.chat_reminds.ManagedChatRemindUser` | `aidi_managed_chat_remind_users` |

Các model `Chat`, `ChatMember`, `ChatMessage`, `ChatNote`, `ChatVote`, `ChatVoteOption`, `ChatVoteResult` trong `core.chats.models` là legacy migration state từ bản đầu. API chat realtime đang chạy bằng nhóm `ManagedChat*`; khi thêm logic mới nên dùng nhóm này để đồng bộ với `prod` và flow 185.
