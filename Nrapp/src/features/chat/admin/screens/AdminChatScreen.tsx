import AdminChatHeader from "@/src/features/chat/admin/ui/AdminChatHeader";
import AdminChatMessages from "@/src/features/chat/admin/ui/AdminChatMessages";
import AdminChatSideBar from "@/src/features/chat/admin/ui/AdminChatSideBar";
import AdminMessageInput from "@/src/features/chat/admin/ui/AdminMessageInput";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import { useChatSocket } from "@/src/features/chat/shared/model/ChatSocketContext";
import { getApiErrorMessage } from "@/src/utils/apiHelper";
import { normalizeUser } from "@/src/shared/model/normalize-user";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import type {
  ChatImageUpload,
  ChatSummary,
  Message,
} from "@/src/services/chat/constant";
import {
  createChat as createChatRequest,
  getChatMessages,
  getChats,
  sendChatMessage,
} from "@/src/services/chat/chat.service";
import { getAllUsers } from "@/src/services/user/user.service";
import type { User } from "@/src/services/user/constant";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import type { KeyboardEvent, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CHAT_AREA_PADDING = 16;

const toIdentifier = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id?: unknown })._id ?? "");
  }
  return value == null ? "" : String(value);
};

const normalizeMessage = (raw: unknown): Message | null => {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const _id = toIdentifier(value._id);
  const chatId = toIdentifier(value.chatId);
  const sender = toIdentifier(value.sender);
  if (!_id || !chatId || !sender) return null;

  const rawImage =
    value.image && typeof value.image === "object"
      ? (value.image as Record<string, unknown>)
      : null;
  const imageUrl = rawImage?.url ? String(rawImage.url) : "";
  const image = imageUrl
    ? {
        url: imageUrl,
        publicId: String(rawImage?.publicId ?? ""),
      }
    : undefined;

  return {
    _id,
    chatId,
    sender,
    text: typeof value.text === "string" ? value.text : undefined,
    image,
    messageType:
      value.messageType === "image" || image ? "image" : "text",
    seen: value.seen === true,
    seenAt: value.seenAt ? String(value.seenAt) : undefined,
    createdAt: String(value.createdAt ?? ""),
  };
};

const mergeMessages = (
  current: Message[] | null,
  incoming: readonly unknown[],
  expectedChatId: string,
) => {
  const messagesById = new Map<string, Message>();
  [...(current ?? []), ...incoming].forEach((raw) => {
    const message = normalizeMessage(raw);
    if (!message || message.chatId !== expectedChatId) return;
    const previous = messagesById.get(message._id);
    messagesById.set(message._id, {
      ...previous,
      ...message,
      seen: Boolean(previous?.seen || message.seen),
      seenAt: message.seenAt ?? previous?.seenAt,
    });
  });

  return Array.from(messagesById.values()).sort((left, right) => {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    const timeDifference =
      (Number.isNaN(leftTime) ? 0 : leftTime) -
      (Number.isNaN(rightTime) ? 0 : rightTime);
    return timeDifference || left._id.localeCompare(right._id);
  });
};

const normalizeChatItem = (raw: any): ChatSummary => {
  const rawUser = raw?.user?.user ?? raw?.user ?? raw?.users?.user ?? {};
  const chatData = raw?.chat ?? {};
  return {
    _id: String(raw?._id ?? chatData?._id ?? ""),
    user: normalizeUser(rawUser),
    chat: {
      _id: String(chatData?._id ?? ""),
      users: Array.isArray(chatData?.users)
        ? chatData.users.map(String)
        : [],
      latestMessage:
        chatData?.latestMessage?.text || chatData?.latestMessage?.sender
          ? {
              text: String(chatData.latestMessage.text ?? ""),
              sender: String(chatData.latestMessage.sender ?? ""),
            }
          : null,
      createdAt: String(chatData?.createdAt ?? ""),
      updatedAt: String(chatData?.updatedAt ?? ""),
      unseenCount:
        typeof chatData?.unseenCount === "number" ? chatData.unseenCount : 0,
    },
  };
};

export default function AdminChatScreen() {
  const insets = useSafeAreaInsets();
  const { loading, isAuth, user: loggedInUser, getToken } = useAuthSession();
  const {
    socket,
    onlineUsers,
    isConnected: isRealtimeConnected,
    connectionError: realtimeError,
  } = useChatSocket();

  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [chatUser, setChatUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [androidKeyboardInset, setAndroidKeyboardInset] = useState(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedChatRef = useRef<string | null>(null);
  const chatSelectionVersionRef = useRef(0);
  const chatRequestSequenceRef = useRef(0);
  const chatListLoadSequenceRef = useRef(0);
  const chatListAppliedSequenceRef = useRef(0);
  const chatAreaRef = useRef<View>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const keyboardMeasureFrameRef = useRef<number | null>(null);

  const otherUserId = toIdentifier(chatUser?.user?._id || chatUser?._id);

  const selectChat = useCallback((chatId: string | null) => {
    selectedChatRef.current = chatId;
    chatSelectionVersionRef.current += 1;
    setSelectedUser(chatId);
    setMessages(null);
    setChatUser(null);
    setMessage("");
    setIsTyping(false);
  }, []);

  const fetchChats = useCallback(async () => {
    const requestSequence = ++chatListLoadSequenceRef.current;
    const token = await getToken();
    if (!token) return;
    const { data } = await getChats(token);
    if (requestSequence < chatListAppliedSequenceRef.current) return;
    chatListAppliedSequenceRef.current = requestSequence;
    setChats((data.chats ?? []).map(normalizeChatItem));
  }, [getToken]);

  const refreshChatsQuietly = useCallback(() => {
    void fetchChats().catch((error) => {
      console.error("[CHAT][REFRESH_LIST_FAILED]", {
        message: getApiErrorMessage(
          error,
          "Không tải được danh sách trò chuyện",
        ),
      });
    });
  }, [fetchChats]);

  const fetchUsers = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const { data } = await getAllUsers(token);
    setUsers((data.users ?? []).map(normalizeUser));
  }, [getToken]);

  useEffect(() => {
    if (!loading && !isAuth) router.replace("/(auth)/login");
  }, [isAuth, loading]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuth) return;
      void Promise.all([fetchUsers(), fetchChats()]).catch((error) => {
        console.error("[CHAT][LOAD_SIDEBAR_FAILED]", {
          message: getApiErrorMessage(error, "Không tải được danh bạ trò chuyện"),
        });
        Alert.alert(
          "Lỗi",
          getApiErrorMessage(error, "Không tải được danh bạ trò chuyện"),
        );
      });
    }, [fetchChats, fetchUsers, isAuth]),
  );

  const fetchChat = useCallback(async (chatId: string) => {
    const selectionVersion = chatSelectionVersionRef.current;
    const requestId = ++chatRequestSequenceRef.current;
    try {
      const token = await getToken();
      if (!token) return;
      const { data } = await getChatMessages(token, chatId);
      if (
        selectedChatRef.current !== chatId ||
        chatSelectionVersionRef.current !== selectionVersion
      ) {
        return;
      }
      setMessages((current) =>
        mergeMessages(current, data.messages ?? [], chatId),
      );
      setChatUser(data.user);
      refreshChatsQuietly();
    } catch (e) {
      if (
        selectedChatRef.current !== chatId ||
        chatSelectionVersionRef.current !== selectionVersion ||
        chatRequestSequenceRef.current !== requestId
      ) {
        return;
      }
      console.error("[CHAT][LOAD_MESSAGES_FAILED]", {
        chatId,
        message: getApiErrorMessage(e, "Không tải được tin nhắn"),
      });
      Alert.alert("Lỗi", getApiErrorMessage(e, "Không tải được tin nhắn"));
    }
  }, [getToken, refreshChatsQuietly]);

  async function createChat(u: User) {
    try {
      const token = await getToken();
      if (!token) return;
      const { data } = await createChatRequest(token, u._id);
      selectChat(String(data.chatId));
      refreshChatsQuietly();
    } catch (e) {
      console.error("[CHAT][CREATE_FAILED]", {
        otherUserId: u._id,
        message: getApiErrorMessage(e, "Không tạo được chat"),
      });
      Alert.alert("Lỗi", getApiErrorMessage(e, "Không tạo được chat"));
    }
  }

  const emitTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (!selectedUser || !socket || !otherUserId) return;
    socket.emit("typingStop", {
      chatId: selectedUser,
      targetUserId: otherUserId,
    });
  }, [otherUserId, selectedUser, socket]);

  const closeChat = useCallback(() => {
    emitTypingStop();
    selectChat(null);
    refreshChatsQuietly();
  }, [emitTypingStop, refreshChatsQuietly, selectChat]);

  const handleMessageSend = async (image?: ChatImageUpload) => {
    const draft = message;
    const text = draft.trim();
    const chatId = selectedChatRef.current;
    if ((!text && !image) || !chatId) return false;
    try {
      emitTypingStop();
      const token = await getToken();
      if (!token) return false;
      const { data } = await sendChatMessage(
        token,
        chatId,
        text,
        image,
      );

      if (selectedChatRef.current === chatId) {
        setMessages((current) => mergeMessages(current, [data.message], chatId));
        setMessage((current) => (current === draft ? "" : current));
      }
      refreshChatsQuietly();
      return true;
    } catch (err: unknown) {
      console.error("[CHAT][SEND_FAILED]", {
        chatId,
        hasText: Boolean(text),
        hasImage: Boolean(image),
        message: getApiErrorMessage(err, "Gửi không thành công"),
      });
      Alert.alert("Lỗi", getApiErrorMessage(err, "Gửi không thành công"));
      return false;
    }
  };

  const handleTyping = (value: string) => {
    setMessage(value);
    if (!selectedUser || !socket || !otherUserId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (!value.trim()) {
      emitTypingStop();
      return;
    }
    socket.emit("typing", { chatId: selectedUser, targetUserId: otherUserId });
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typingStop", {
        chatId: selectedUser,
        targetUserId: otherUserId,
      });
      typingTimeoutRef.current = null;
    }, 800);
  };

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (data: { message?: unknown } | undefined) => {
      const incomingMessage = normalizeMessage(data?.message);
      if (!incomingMessage) return;
      if (incomingMessage.chatId === selectedChatRef.current) {
        setMessages((current) =>
          mergeMessages(current, [incomingMessage], incomingMessage.chatId),
        );
        void fetchChat(incomingMessage.chatId);
      } else {
        refreshChatsQuietly();
      }
    };
    const handleUserTyping = (data: { chatId: string; userId: string }) => {
      if (
        toIdentifier(data.chatId) === selectedUser &&
        toIdentifier(data.userId) === otherUserId
      ) {
        setIsTyping(true);
      }
    };
    const handleUserTypingStop = (data: { chatId: string }) => {
      if (toIdentifier(data.chatId) === selectedUser) setIsTyping(false);
    };
    const handleMessagesSeen = (data: { chatId: string }) => {
      if (toIdentifier(data.chatId) !== selectedUser) return;
      setMessages((current) =>
        current?.map((item) =>
          toIdentifier(item.sender) === toIdentifier(loggedInUser?._id)
            ? { ...item, seen: true, seenAt: new Date().toISOString() }
            : item,
        ) ?? null,
      );
    };
    socket.on("newMessage", handleNewMessage);
    socket.on("userTyping", handleUserTyping);
    socket.on("userTypingStop", handleUserTypingStop);
    socket.on("messagesSeen", handleMessagesSeen);
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("userTyping", handleUserTyping);
      socket.off("userTypingStop", handleUserTypingStop);
      socket.off("messagesSeen", handleMessagesSeen);
    };
  }, [fetchChat, loggedInUser?._id, socket, selectedUser, otherUserId, refreshChatsQuietly]);

  useEffect(() => {
    if (selectedUser) void fetchChat(selectedUser);
  }, [fetchChat, selectedUser]);

  useEffect(() => {
    if (!isRealtimeConnected) setIsTyping(false);
  }, [isRealtimeConnected]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeChat();
      return true;
    });
    return () => subscription.remove();
  }, [closeChat, selectedUser]);

  const measureAndroidKeyboardOverlap = useCallback((keyboardTop: number) => {
    if (keyboardMeasureFrameRef.current !== null) {
      cancelAnimationFrame(keyboardMeasureFrameRef.current);
    }

    keyboardMeasureFrameRef.current = requestAnimationFrame(() => {
      keyboardMeasureFrameRef.current = null;
      chatAreaRef.current?.measureInWindow((_x, y, _width, height) => {
        // Android reports measureInWindow from below the status bar while the
        // keyboard frame uses full-screen coordinates. Normalize both before
        // calculating how much of the chat is covered.
        const chatBottomOnScreen = y + height + insets.top;
        const overlap = Math.max(0, chatBottomOnScreen - keyboardTop);
        setAndroidKeyboardInset((current) =>
          Math.abs(current - overlap) < 1 ? current : overlap,
        );
      });
    });
  }, [insets.top]);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event: KeyboardEvent) => {
        keyboardTopRef.current = event.endCoordinates.screenY;
        measureAndroidKeyboardOverlap(event.endCoordinates.screenY);
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTopRef.current = null;
      setAndroidKeyboardInset(0);
    });
    const currentKeyboard = Keyboard.metrics();
    if (currentKeyboard) {
      keyboardTopRef.current = currentKeyboard.screenY;
      measureAndroidKeyboardOverlap(currentKeyboard.screenY);
    }

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (keyboardMeasureFrameRef.current !== null) {
        cancelAnimationFrame(keyboardMeasureFrameRef.current);
      }
    };
  }, [measureAndroidKeyboardOverlap]);

  const handleChatAreaLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      if (keyboardTopRef.current !== null) {
        measureAndroidKeyboardOverlap(keyboardTopRef.current);
      }
    },
    [measureAndroidKeyboardOverlap],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  if (!selectedUser) {
    return (
      <AdminChatSideBar
        users={users}
        loggedInUser={loggedInUser}
        chats={chats}
        setSelectedUser={selectChat}
        createChat={createChat}
        refreshUsers={async () => {
          try {
            await Promise.all([fetchUsers(), fetchChats()]);
          } catch (error) {
            Alert.alert(
              "Lỗi",
              getApiErrorMessage(error, "Không làm mới được danh bạ trò chuyện"),
            );
          }
        }}
        onlineUsers={onlineUsers}
        isRealtimeConnected={isRealtimeConnected}
        hasRealtimeError={Boolean(realtimeError)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View
        ref={chatAreaRef}
        onLayout={handleChatAreaLayout}
        style={[
          styles.chatArea,
          androidKeyboardInset > 0 && {
            paddingBottom: CHAT_AREA_PADDING + androidKeyboardInset,
          },
        ]}
      >
          <AdminChatHeader
          user={chatUser}
          onBack={closeChat}
          isTyping={isTyping}
          otherUserId={otherUserId}
          onlineUsers={onlineUsers}
          isRealtimeConnected={isRealtimeConnected}
          hasRealtimeError={Boolean(realtimeError)}
        />
          <AdminChatMessages
          selectedUser={selectedUser}
          messages={messages}
          loggedInUser={loggedInUser}
        />
          <AdminMessageInput
          selectedUser={selectedUser}
          message={message}
          setMessage={handleTyping}
          handleMessageSend={handleMessageSend}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  center: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  chatArea: {
    flex: 1,
    padding: CHAT_AREA_PADDING,
    backgroundColor: "#f8fafc",
  },
});
