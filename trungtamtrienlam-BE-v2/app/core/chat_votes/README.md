# Chat Vote Module

This folder contains the local Django implementation for chat vote APIs.

The concrete Django model classes live in `core.chat_votes.models`:

- `ManagedChatVote`
- `ManagedChatVoteOption`
- `ManagedChatVoteResult`

They use the managed chat table naming convention:

- `aidi_managed_chat_votes`
- `aidi_managed_chat_vote_options`
- `aidi_managed_chat_vote_results`

Public endpoints stay compatible with the current frontend:

- `api/ChatVote/GetList`
- `api/ChatVote/CreateVote`
- `api/ChatVote/DeleteVote`
- `api/ChatVote/PinOrUnpin`
- `api/ChatVote/Vote`
- `api/ChatVote/GetVoteResult`
- `api/ChatVote/CreateOptions`
