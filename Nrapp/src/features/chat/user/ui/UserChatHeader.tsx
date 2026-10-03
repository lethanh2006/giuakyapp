import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ChatHeaderProps {
  user: any;
  onBack: () => void;
  isTyping: boolean;
  otherUserId?: string;
  onlineUsers?: string[];
  isRealtimeConnected?: boolean;
  hasRealtimeError?: boolean;
}

export default function UserChatHeader({
  user,
  onBack,
  isTyping,
  otherUserId,
  onlineUsers = [],
  isRealtimeConnected = false,
  hasRealtimeError = false,
}: ChatHeaderProps) {
  const isOnline = otherUserId && onlineUsers.includes(otherUserId);
  const normalizedUser = user?.user ?? user;
  const displayName =
    normalizedUser?.name ||
    normalizedUser?.username ||
    normalizedUser?.email ||
    "Người dùng";

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Quay lại danh sách trò chuyện"
        accessibilityRole="button"
        hitSlop={8}
        style={styles.backBtn}
        onPress={onBack}
      >
        <Ionicons name="arrow-back" size={20} color="#334155" />
      </Pressable>

      <View style={styles.userInfo}>
        {user ? (
          <>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color="#9ca3af" />
              </View>
              {isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={isTyping ? styles.typing : styles.presence}>
                {isTyping
                  ? "đang nhập..."
                  : !isRealtimeConnected
                    ? hasRealtimeError
                      ? "mất kết nối realtime"
                      : "đang kết nối realtime..."
                    : isOnline
                      ? "đang hoạt động"
                      : "ngoại tuyến"}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color="#6b7280" />
            </View>
            <View>
              <Text style={styles.placeholderTitle}>Chọn cuộc trò chuyện</Text>
              <Text style={styles.placeholderSub}>Chọn chat từ sidebar để bắt đầu</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  typing: {
    fontSize: 14,
    color: '#2563eb',
    fontStyle: 'italic',
    marginTop: 2,
  },
  presence: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999999',
  },
  placeholderSub: {
    fontSize: 12,
    color: '#aaaaaa',
    marginTop: 4,
  },
});
