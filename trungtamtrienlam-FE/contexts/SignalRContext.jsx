"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useMaintenance } from "./MaintenanceContext";
import { useNotification } from "./NotificationPushContext";
import { MessageConstants } from "@/constants/notificationContants";
import { ApiConstants } from "@/constants/apiConstants";

const SignalRContext = createContext();

export const useSignalR = () => useContext(SignalRContext);

const API_BASE_URL = ApiConstants.baseUrl;

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

const buildChatEventSourceUrl = (baseUrl, userId, token) => {
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8002";
  const rawBase = (baseUrl || fallbackOrigin).replace(/\/+$/, "");
  const apiBase = /\/api$/i.test(rawBase) ? rawBase : `${rawBase}/api`;
  const params = new URLSearchParams({ userID: userId });

  if (token) {
    params.set("token", token);
  }

  return `${apiBase}/Chat/Events?${params.toString()}`;
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

const safeJsonParse = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const stripHtml = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const notificationType = (payload) =>
  Number(
    payload?.type ??
      payload?.Type ??
      payload?.notificationType ??
      payload?.notification_type ??
      payload?.data?.type ??
      payload?.data?.Type
  );

const getPayloadMetaData = (payload = {}) =>
  safeJsonParse(payload?.metaData ?? payload?.MetaData ?? payload?.data?.metaData ?? payload?.data?.MetaData, {});

const isChatNotification = (payload) => {
  const referenceType = String(
    payload?.referenceType ?? payload?.reference_type ?? payload?.data?.referenceType ?? payload?.data?.reference_type ?? ""
  ).toLowerCase();
  const metaData = getPayloadMetaData(payload);

  return (
    notificationType(payload) === MessageConstants.types.Chat ||
    referenceType === "chat" ||
    Boolean(metaData?.chatID || metaData?.ChatID || payload?.chatID || payload?.ChatID)
  );
};

const getDesktopNotificationInfo = (payload = {}, options = {}) => {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const metaData = getPayloadMetaData(payload);
  const chatID = normalizeId(
    options.chatID ?? payload?.chatID ?? payload?.ChatID ?? data?.chatID ?? data?.ChatID ?? metaData?.chatID ?? metaData?.ChatID
  );
  const messageID = normalizeId(
    options.messageID ??
      metaData?.messageID ??
      metaData?.MessageID ??
      payload?.messageID ??
      payload?.MessageID ??
      data?.messageID ??
      data?.MessageID ??
      (chatID ? payload?.id ?? payload?.ID : "")
  );
  const notificationID = normalizeId(payload?.id ?? payload?.ID ?? data?.id ?? data?.ID);
  const isChat = options.isChat ?? isChatNotification(payload) ?? Boolean(chatID);
  const title = stripHtml(
    options.title ?? payload?.title ?? payload?.Title ?? data?.title ?? data?.Title ?? (isChat ? "Tin nhắn" : "Thông báo")
  );
  const body = stripHtml(
    options.body ??
      payload?.content ??
      payload?.Content ??
      payload?.body ??
      payload?.Body ??
      data?.content ??
      data?.Content ??
      data?.body ??
      data?.Body ??
      payload?.message
  );
  const url =
    options.url ??
    payload?.url ??
    payload?.link ??
    data?.url ??
    data?.link ??
    (isChat && chatID ? `/chats?chatId=${encodeURIComponent(chatID)}` : "/notifications");
  const tag =
    options.tag ??
    (chatID && messageID
      ? `chat-${chatID}-message-${messageID}`
      : notificationID
        ? `notification-${notificationID}`
        : `${isChat ? "chat" : "notification"}-${Date.now()}`);

  return {
    title: title || (isChat ? "Tin nhắn" : "Thông báo"),
    body: body || (isChat ? "Bạn có tin nhắn mới" : "Bạn có thông báo mới"),
    url,
    tag,
  };
};

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
  const eventSourceRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const sseReconnectTimerRef = useRef(null);
  const sseReconnectAttemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const { setStartTime, setIsCountdown, setIsMaintenanceAllowed } = useMaintenance();
  const { addNotification, setNotificationData } = useNotification();

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
  const desktopNotificationDedupeRef = useRef(new Map());

  const playNotificationSound = useCallback(() => {
    const audio = audioRef.current;
    if (!audioAllowedRef.current || !audio) return;

    audio.muted = false;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  const showDesktopNotification = useCallback((payload, options = {}) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const info = getDesktopNotificationInfo(payload, options);
    const now = Date.now();
    const shownAt = desktopNotificationDedupeRef.current.get(info.tag);
    if (shownAt && now - shownAt < 4000) return;

    desktopNotificationDedupeRef.current.set(info.tag, now);
    desktopNotificationDedupeRef.current.forEach((value, key) => {
      if (now - value > 60000) desktopNotificationDedupeRef.current.delete(key);
    });

    try {
      const notification = new Notification(info.title, {
        body: info.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: info.tag,
        renotify: true,
        data: { url: info.url },
      });

      notification.onclick = () => {
        window.focus();
        if (notification.data?.url) {
          window.location.assign(notification.data.url);
        }
        notification.close();
      };
    } catch (error) {
      console.warn("Cannot show desktop notification:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    audioRef.current = new Audio("/audios/notification.mp3");
    audioRef.current.preload = "auto";

    const allowAudio = () => {
      const audio = audioRef.current;
      audioAllowedRef.current = true;

      if ("Notification" in window && Notification.permission === "default") {
        const permissionRequest = Notification.requestPermission();
        permissionRequest?.catch?.(() => {});
      }

      if (!audio) return;

      audio.muted = true;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    };

    window.addEventListener("click", allowAudio, { once: true });
    window.addEventListener("keydown", allowAudio, { once: true });
    window.addEventListener("touchstart", allowAudio, { once: true });

    return () => {
      window.removeEventListener("click", allowAudio);
      window.removeEventListener("keydown", allowAudio);
      window.removeEventListener("touchstart", allowAudio);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const userId = getUserId(user);
    if (!userId) return undefined;

    let stopped = false;
    const reconnectDelays = [1000, 2000, 5000, 10000, 30000];
    const sseReconnectDelays = [500, 1000, 2000, 5000, 10000];

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const clearSseReconnect = () => {
      if (sseReconnectTimerRef.current) {
        clearTimeout(sseReconnectTimerRef.current);
        sseReconnectTimerRef.current = null;
      }
    };

    const isEventSourceActive = () => {
      const source = eventSourceRef.current;
      return Boolean(source && source.readyState !== EventSource.CLOSED);
    };

    const closeEventSource = () => {
      clearSseReconnect();
      const source = eventSourceRef.current;
      eventSourceRef.current = null;
      if (source) {
        source.onopen = null;
        source.onmessage = null;
        source.onerror = null;
        source.close();
      }
    };

    const scheduleReconnect = () => {
      if (stopped) return;

      const delay = reconnectDelays[Math.min(reconnectAttemptRef.current, reconnectDelays.length - 1)];
      reconnectAttemptRef.current += 1;
      clearReconnect();
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    const scheduleSseReconnect = () => {
      if (stopped || typeof window === "undefined" || !window.EventSource) return;

      const delay = sseReconnectDelays[Math.min(sseReconnectAttemptRef.current, sseReconnectDelays.length - 1)];
      sseReconnectAttemptRef.current += 1;
      clearSseReconnect();
      sseReconnectTimerRef.current = setTimeout(startEventSource, delay);
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
          reconnectAttemptRef.current = 0;
          setIsConnected(true);
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
            showDesktopNotification(firstMessage, { title: "Tin nhắn", isChat: true });
          }
          callCallbacks(chatCallbacks, normalized);
          break;

        case "ChatMessage":
          if (firstMessage?.fromUserID && normalizeId(firstMessage.fromUserID) !== userId) {
            playNotificationSound();
            showDesktopNotification(firstMessage, { title: "Tin nhắn", isChat: true });
          }
          callCallbacks(chatMessageCallbacks, normalized);
          break;

        case "Typing":
          handleTyping(payload);
          break;

        case "Notify":
          playNotificationSound();
          if (payload) {
            const incomingNotifications = Array.isArray(payload) ? payload : [payload];
            incomingNotifications.filter(Boolean).forEach((item) => {
              showDesktopNotification(item, { isChat: isChatNotification(item) });
            });
            setNotificationData((prev) => {
              const existingIds = new Set((prev || []).map((item) => String(item?.id ?? item?.ID ?? "")).filter(Boolean));
              const nextItems = incomingNotifications.filter((item) => {
                const id = String(item?.id ?? item?.ID ?? "");
                return !id || !existingIds.has(id);
              });
              return [...nextItems, ...(prev || [])];
            });
          }
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

    const startEventSource = () => {
      if (stopped || typeof window === "undefined" || !window.EventSource) return;

      const currentSource = eventSourceRef.current;
      if (currentSource && currentSource.readyState !== EventSource.CLOSED) return;

      const sseUrl = buildChatEventSourceUrl(API_BASE_URL, userId, token);
      const source = new EventSource(sseUrl);
      eventSourceRef.current = source;

      source.onopen = () => {
        clearSseReconnect();
        console.log("Realtime SSE fallback connected");
      };

      source.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const eventName = message.event || message.Event || message.type || message.Type;
          const payload = Object.prototype.hasOwnProperty.call(message, "data") ? message.data : message;
          if (eventName === "Connected") {
            sseReconnectAttemptRef.current = 0;
          }
          handleEvent(eventName, payload);
        } catch (error) {
          console.error("Realtime SSE message parse error:", error);
        }
      };

      source.onerror = (error) => {
        console.warn("Realtime SSE fallback connection failed.", error);
        if (eventSourceRef.current === source) {
          eventSourceRef.current = null;
        }
        source.close();
        const socket = connectionRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          setIsConnected(false);
        }
        scheduleSseReconnect();
      };
    };

    let connectedAckTimer = null;
    const clearConnectedAck = () => {
      if (connectedAckTimer) {
        clearTimeout(connectedAckTimer);
        connectedAckTimer = null;
      }
    };

    function connect() {
      if (stopped) return;

      const wsUrl = buildChatWebSocketUrl(API_BASE_URL, userId, token);
      const socket = new WebSocket(wsUrl);
      connectionRef.current = socket;

      socket.onopen = () => {
        console.log("Realtime WebSocket opened, waiting for server acknowledgement");
        clearConnectedAck();
        connectedAckTimer = setTimeout(() => {
          if (stopped || connectionRef.current !== socket || socket.readyState !== WebSocket.OPEN) return;
          console.warn("Realtime WebSocket did not receive Connected acknowledgement. Reconnecting and using polling fallback.");
          socket.close();
        }, 7000);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const eventName = message.event || message.Event || message.type || message.Type;
          const payload = Object.prototype.hasOwnProperty.call(message, "data") ? message.data : message;
          if (eventName === "Connected") {
            closeEventSource();
            clearConnectedAck();
          }
          handleEvent(eventName, payload);
        } catch (error) {
          console.error("Realtime message parse error:", error);
        }
      };

      socket.onerror = (error) => {
        console.warn("Realtime WebSocket connection failed. Check that backend is running with start-be.bat.", error);
      };

      socket.onclose = () => {
        clearConnectedAck();
        if (connectionRef.current === socket) {
          connectionRef.current = null;
        }
        if (!isEventSourceActive()) {
          setIsConnected(false);
        }
        startEventSource();
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      stopped = true;
      clearReconnect();
      clearSseReconnect();
      clearConnectedAck();
      closeEventSource();
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
    showDesktopNotification,
    setIsCountdown,
    setIsMaintenanceAllowed,
    setStartTime,
    addNotification,
    setNotificationData,
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

