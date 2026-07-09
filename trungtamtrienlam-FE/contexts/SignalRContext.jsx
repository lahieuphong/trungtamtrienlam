"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useMaintenance } from "./MaintenanceContext";
import { useNotification } from "./NotificationPushContext";
import { MessageConstants } from "@/constants/notificationContants";

const SignalRContext = createContext();

export const useSignalR = () => useContext(SignalRContext);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const normalizeId = (value) => (value === null || value === undefined ? "" : String(value).trim());

const getUserId = (user) =>
  normalizeId(user?.userID ?? user?.UserID ?? user?.id ?? user?.ID ?? user?.username ?? user?.email);

const buildChatWebSocketUrl = (baseUrl, userId, token) => {
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8002";
  const rawBase = (baseUrl || fallbackOrigin).replace(/\/+$/, "").replace(/\/api$/i, "");
  const wsBase = rawBase.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
  const params = new URLSearchParams({ userID: userId });

  if (token) {
    params.set("token", token);
  }

  return `${wsBase}/ws/chat/?${params.toString()}`;
};

const normalizeChatMessage = (message) => {
  if (!message || typeof message !== "object") {
    return message;
  }

  const senderAvatar = message.senderAvatar ?? message.SenderAvatar ?? message.Avatar ?? message.avatar ?? "";

  return {
    ...message,
    id: message.id ?? message.ID,
    senderID: message.senderID ?? message.SenderID,
    chatID: message.chatID ?? message.ChatID,
    content: message.content ?? message.Content,
    messageType: message.messageType ?? message.MessageType,
    replyToID: message.replyToID ?? message.ReplyToID,
    createdDate: message.createdDate ?? message.CreatedDate,
    chatFiles: message.chatFiles ?? message.ChatFiles,
    chatLinks: message.chatLinks ?? message.ChatLinks,
    chatUsers: message.chatUsers ?? message.ChatUsers,
    chatType: message.chatType ?? message.ChatType,
    senderName: message.senderName ?? message.SenderName,
    senderAvatar,
    avatar: message.avatar ?? message.Avatar ?? senderAvatar,
    eventID: message.eventID ?? message.EventID,
    eventType: message.eventType ?? message.EventType,
    listUserJoinRemind: message.listUserJoinRemind ?? message.ListUserJoinRemind,
  };
};

const normalizePayload = (payload) =>
  Array.isArray(payload) ? payload.map(normalizeChatMessage) : normalizeChatMessage(payload);

const notificationType = (payload) =>
  Number(payload?.type ?? payload?.Type ?? payload?.data?.type ?? payload?.data?.Type);

const isChatNotification = (payload) => notificationType(payload) === MessageConstants.types.Chat;

const callCallbacks = (callbacksRef, ...args) => {
  callbacksRef.current.forEach((fn) => {
    try {
      fn(...args);
    } catch (error) {
      console.error("Realtime callback error:", error);
    }
  });
};

export const SignalRProvider = ({ user, token, children }) => {
  const connectionRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const { setStartTime, setIsCountdown, setIsMaintenanceAllowed } = useMaintenance();
  const { addNotification } = useNotification();

  const chatMessageCallbacks = useRef([]);
  const chatCallbacks = useRef([]);
  const notifyCallbacks = useRef([]);
  const notifyLogoutCallbacks = useRef([]);
  const notifyLoadAvatarCallbacks = useRef([]);
  const seenTaskHistoryCallbacks = useRef([]);
  const typingCallbacks = useRef([]);
  const reloadCalendar = useRef([]);
  const reloadNotification = useRef([]);

  const audioRef = useRef(null);
  const audioAllowedRef = useRef(false);

  const playNotificationSound = useCallback(() => {
    if (audioAllowedRef.current && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    audioRef.current = new Audio("/audios/notification.mp3");
    const allowAudio = () => {
      audioAllowedRef.current = true;
    };
    window.addEventListener("click", allowAudio);

    return () => {
      window.removeEventListener("click", allowAudio);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const userId = getUserId(user);
    if (!userId) return undefined;

    let stopped = false;
    const reconnectDelays = [1000, 2000, 5000, 10000, 30000];

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (stopped) return;

      const delay = reconnectDelays[Math.min(reconnectAttemptRef.current, reconnectDelays.length - 1)];
      reconnectAttemptRef.current += 1;
      clearReconnect();
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    const handleTyping = (payload = {}) => {
      const chatId = payload.chatID ?? payload.chatId;
      const typingUserId = payload.userID ?? payload.userId;
      const isTyping = Boolean(payload.isTyping);

      if (!chatId || !typingUserId) return;

      setTypingUsers((prev) => {
        const updated = { ...prev };
        const list = new Set(updated[chatId] || []);
        if (isTyping) {
          list.add(typingUserId);
        } else {
          list.delete(typingUserId);
        }
        updated[chatId] = [...list];
        return updated;
      });

      callCallbacks(typingCallbacks, chatId, typingUserId, isTyping);
    };

    const handleEvent = (eventName, payload) => {
      const normalized = normalizePayload(payload);
      const firstMessage = Array.isArray(normalized) ? normalized[0] : normalized;

      switch (eventName) {
        case "Connected":
          setOnlineUsers((prev) => [...new Set([...prev, userId])]);
          break;

        case "LstClientConnect":
          try {
            const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
            const users = [...new Set((parsed || []).map((item) => normalizeId(item.Value ?? item.value)))].filter(Boolean);
            setOnlineUsers(users);
          } catch (error) {
            console.error("Parse LstClientConnect error:", error);
          }
          break;

        case "Chat":
          if (
            !firstMessage?.isSeenUpdate &&
            !firstMessage?.IsSeenUpdate &&
            firstMessage?.senderID &&
            normalizeId(firstMessage.senderID) !== userId
          ) {
            playNotificationSound();
          }
          callCallbacks(chatCallbacks, normalized);
          break;

        case "ChatMessage":
          if (firstMessage?.fromUserID && normalizeId(firstMessage.fromUserID) !== userId) {
            playNotificationSound();
          }
          callCallbacks(chatMessageCallbacks, normalized);
          break;

        case "Typing":
          handleTyping(payload);
          break;

        case "Notify":
          playNotificationSound();
          callCallbacks(notifyCallbacks, payload);
          break;

        case "NotifyLogout":
          callCallbacks(notifyLogoutCallbacks, payload);
          break;

        case "NotifyLoadAvatar":
          callCallbacks(notifyLoadAvatarCallbacks, payload);
          break;

        case "SeenHistory":
          callCallbacks(seenTaskHistoryCallbacks, payload);
          break;

        case "Finish":
          setIsCountdown(false);
          setIsMaintenanceAllowed(false);
          localStorage.removeItem("isCountdown");
          localStorage.removeItem("startTime");
          localStorage.removeItem("isMaintenance");
          break;

        case "Maintenance": {
          const fixedStartTime = String(payload?.startTime || "").replace(/Z$/, "");
          localStorage.setItem("isCountdown", true);
          localStorage.setItem("startTime", fixedStartTime);
          setIsCountdown(true);
          setStartTime(fixedStartTime);
          break;
        }

        case "PushNotification":
          if (payload && !isChatNotification(payload)) {
            addNotification(payload.content);
          }
          break;

        case "ReloadCalendar":
          if (payload) {
            callCallbacks(reloadCalendar, payload);
          }
          break;

        case "ReloadNotification":
          if (normalizeId(payload?.userId) === userId) {
            callCallbacks(reloadNotification, payload);
          }
          break;

        default:
          break;
      }
    };

    function connect() {
      if (stopped) return;

      const wsUrl = buildChatWebSocketUrl(API_BASE_URL, userId, token);
      const socket = new WebSocket(wsUrl);
      connectionRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setIsConnected(true);
        console.log("Realtime WebSocket connected");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const eventName = message.event || message.Event || message.type || message.Type;
          const payload = Object.prototype.hasOwnProperty.call(message, "data") ? message.data : message;
          handleEvent(eventName, payload);
        } catch (error) {
          console.error("Realtime message parse error:", error);
        }
      };

      socket.onerror = (error) => {
        console.warn("Realtime WebSocket connection failed. Check that backend is running with start-be.bat.", error);
      };

      socket.onclose = () => {
        if (connectionRef.current === socket) {
          connectionRef.current = null;
        }
        setIsConnected(false);
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      stopped = true;
      clearReconnect();
      setIsConnected(false);
      const socket = connectionRef.current;
      connectionRef.current = null;
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
      }
    };
  }, [
    user?.userID,
    user?.UserID,
    user?.id,
    user?.ID,
    user?.username,
    user?.email,
    token,
    playNotificationSound,
    setIsCountdown,
    setIsMaintenanceAllowed,
    setStartTime,
    addNotification,
  ]);

  const registerChatMessageCallback = useCallback((fn) => {
    chatMessageCallbacks.current.push(fn);
    return () => {
      chatMessageCallbacks.current = chatMessageCallbacks.current.filter((f) => f !== fn);
    };
  }, []);

  const registerChatCallback = useCallback((fn) => {
    chatCallbacks.current.push(fn);
    return () => {
      chatCallbacks.current = chatCallbacks.current.filter((f) => f !== fn);
    };
  }, []);

  const registerTypingCallback = useCallback((fn) => {
    typingCallbacks.current.push(fn);
    return () => {
      typingCallbacks.current = typingCallbacks.current.filter((f) => f !== fn);
    };
  }, []);

  const registerNotifyCallback = useCallback((fn) => {
    notifyCallbacks.current.push(fn);
    return () => {
      notifyCallbacks.current = notifyCallbacks.current.filter((f) => f !== fn);
    };
  }, []);

  const registerNotifyLogoutCallback = useCallback((fn) => {
    notifyLogoutCallbacks.current.push(fn);
    return () => {
      notifyLogoutCallbacks.current = notifyLogoutCallbacks.current.filter((f) => f !== fn);
    };
  }, []);

  const registerNotifyLoadAvatarCallback = useCallback((fn) => {
    notifyLoadAvatarCallbacks.current.push(fn);
    return () => {
      notifyLoadAvatarCallbacks.current = notifyLoadAvatarCallbacks.current.filter((f) => f !== fn);
    };
  }, []);

  const registerSeenTaskHistoryCallback = useCallback((fn) => {
    seenTaskHistoryCallbacks.current.push(fn);
    return () => {
      seenTaskHistoryCallbacks.current = seenTaskHistoryCallbacks.current.filter((f) => f !== fn);
    };
  }, []);

  const sendTyping = useCallback((chatId, userId, isTyping = true) => {
    const socket = connectionRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !chatId) return;

    socket.send(
      JSON.stringify({
        action: "typing",
        chatID: chatId,
        userID: userId,
        isTyping,
      }),
    );
  }, []);

  const sendReloadCalendar = useCallback((fn) => {
    reloadCalendar.current.push(fn);
    return () => {
      reloadCalendar.current = reloadCalendar.current.filter((f) => f !== fn);
    };
  }, []);

  const sendReloadNotification = useCallback((fn) => {
    reloadNotification.current.push(fn);
    return () => {
      reloadNotification.current = reloadNotification.current.filter((f) => f !== fn);
    };
  }, []);

  return (
    <SignalRContext.Provider
      value={{
        isConnected,
        onlineUsers,
        typingUsers,
        registerChatMessageCallback,
        registerNotifyCallback,
        registerNotifyLogoutCallback,
        registerNotifyLoadAvatarCallback,
        registerSeenTaskHistoryCallback,
        registerChatCallback,
        registerTypingCallback,
        sendTyping,
        sendReloadCalendar,
        sendReloadNotification,
      }}
    >
      {children}
    </SignalRContext.Provider>
  );
};

