import { Ionicons } from "@expo/vector-icons";
import type { ChatSummary } from "@/src/services/chat/constant";
import type { User } from "@/src/services/user/constant";
import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface ChatSideBarProps {
  users: User[] | null;
  loggedInUser: User | null;
  chats: ChatSummary[] | null;
  setSelectedUser: (id: string | null) => void;
  createChat: (user: User) => Promise<void>;
  refreshUsers: () => Promise<void>;
  onlineUsers?: string[];
  isRealtimeConnected?: boolean;
  hasRealtimeError?: boolean;
}

const getName = (user: User) => user.name || user.username || user.email || "Nhân viên";

const getChatUserId = (item: ChatSummary) => {
  const raw = (item.user as any)?.user ?? item.user;
  return String(raw?._id ?? "");
};

const formatRelativeTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const elapsed = Math.floor((Date.now() - date.getTime()) / 60000);
  if (elapsed < 1) return "Vừa xong";
  if (elapsed < 60) return `${elapsed} phút`;
  if (elapsed < 1440) return `${Math.floor(elapsed / 60)} giờ`;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};

export default function AdminChatSideBar({
  users,
  loggedInUser,
  chats,
  setSelectedUser,
  createChat,
  refreshUsers,
  onlineUsers = [],
  isRealtimeConnected = false,
  hasRealtimeError = false,
}: ChatSideBarProps) {
  const [query, setQuery] = useState("");
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();

  const chatByUserId = useMemo(() => {
    const map = new Map<string, ChatSummary>();
    (chats ?? []).forEach((item) => map.set(getChatUserId(item), item));
    return map;
  }, [chats]);

  const employees = useMemo(
    () =>
      (users ?? [])
        .filter((user) => user._id !== loggedInUser?._id)
        .filter((user) => {
          const searchable = `${getName(user)} ${user.email ?? ""}`.toLowerCase();
          return searchable.includes(normalizedQuery);
        })
        .sort((left, right) => {
          const leftChat = chatByUserId.get(left._id);
          const rightChat = chatByUserId.get(right._id);
          if (leftChat && !rightChat) return -1;
          if (!leftChat && rightChat) return 1;
          if (leftChat && rightChat) {
            return new Date(rightChat.chat.updatedAt).getTime() - new Date(leftChat.chat.updatedAt).getTime();
          }
          return getName(left).localeCompare(getName(right), "vi");
        }),
    [chatByUserId, loggedInUser?._id, normalizedQuery, users],
  );

  const openEmployee = async (employee: User) => {
    if (openingUserId) return;
    const existingChat = chatByUserId.get(employee._id);
    if (existingChat) {
      setSelectedUser(existingChat.chat._id);
      return;
    }
    setOpeningUserId(employee._id);
    try {
      await createChat(employee);
    } finally {
      setOpeningUserId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Kênh điều hành</Text>
          <View style={styles.connectionLine}>
            <View
              style={[
                styles.connectionDot,
                isRealtimeConnected && styles.connectionDotOnline,
                hasRealtimeError && styles.connectionDotError,
              ]}
            />
            <Text style={styles.subtitle}>
              {employees.length} nhân viên · {isRealtimeConnected
                ? "Realtime"
                : hasRealtimeError
                  ? "Mất kết nối"
                  : "Đang kết nối"}
            </Text>
          </View>
        </View>
        <View style={styles.companyIcon}>
          <Ionicons name="shield-checkmark" size={22} color="#ffffff" />
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#dc2626" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm nhân viên theo tên hoặc email"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {!!query && (
          <Pressable
            accessibilityLabel="Xóa từ khóa tìm kiếm"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setQuery("")}
          >
            <Ionicons name="close-circle" size={19} color="#94a3b8" />
          </Pressable>
        )}
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          try {
            await refreshUsers();
          } finally {
            setRefreshing(false);
          }
        }}
        renderItem={({ item }) => {
          const existingChat = chatByUserId.get(item._id);
          const latest = existingChat?.chat.latestMessage;
          const unread = existingChat?.chat.unseenCount ?? 0;
          const online = onlineUsers.includes(item._id);
          const opening = openingUserId === item._id;
          const latestIsMine =
            Boolean(loggedInUser?._id) &&
            String(latest?.sender) === String(loggedInUser?._id);
          const rawLatestText = latest?.text?.trim();
          const latestText =
            rawLatestText === "Sent an image"
              ? "Hình ảnh"
              : rawLatestText || "Tin nhắn";
          return (
            <Pressable
              accessibilityLabel={`Mở cuộc trò chuyện với ${getName(item)}`}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => void openEmployee(item)}
              disabled={Boolean(openingUserId)}
            >
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getName(item).charAt(0).toUpperCase()}</Text>
                </View>
                {online && <View style={styles.onlineDot} />}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.nameLine}>
                  <Text style={[styles.name, unread > 0 && styles.unreadName]} numberOfLines={1}>
                    {getName(item)}
                  </Text>
                  <Text style={styles.time}>{formatRelativeTime(existingChat?.chat.updatedAt)}</Text>
                </View>
                <View style={styles.previewLine}>
                  <Text style={[styles.preview, unread > 0 && styles.unreadPreview]} numberOfLines={1}>
                    {opening
                      ? "Đang mở cuộc trò chuyện..."
                      : latest
                        ? `${latestIsMine ? "Bạn: " : ""}${latestText}`
                        : item.email || "Nhấn để bắt đầu trò chuyện"}
                  </Text>
                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={44} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {query ? "Không tìm thấy nhân viên" : "Chưa có nhân viên nào khác"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 14, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 22, backgroundColor: "#7f1d1d", shadowColor: "#7f1d1d", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 22, fontWeight: "900", color: "#ffffff" },
  subtitle: { fontSize: 12, color: "#fecaca" },
  connectionLine: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  connectionDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#f59e0b" },
  connectionDotOnline: { backgroundColor: "#22c55e" },
  connectionDotError: { backgroundColor: "#ef4444" },
  companyIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.18)", backgroundColor: "rgba(255, 255, 255, 0.12)" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 9, height: 48, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", paddingHorizontal: 14, marginBottom: 12, backgroundColor: "#ffffff" },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: 14, color: "#0f172a" },
  listContent: { flexGrow: 1, paddingBottom: 20 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 76, marginBottom: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff" },
  rowPressed: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  avatarWrap: { position: "relative", marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#dc2626" },
  onlineDot: { position: "absolute", right: 1, bottom: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#fff", backgroundColor: "#22c55e" },
  rowBody: { flex: 1, minWidth: 0, marginRight: 6 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1e293b" },
  unreadName: { fontWeight: "800" },
  time: { fontSize: 12, color: "#9ca3af" },
  previewLine: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
  preview: { flex: 1, fontSize: 12, color: "#64748b" },
  unreadPreview: { fontWeight: "700", color: "#334155" },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#dc2626" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  empty: { flex: 1, minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#94a3b8" },
});
