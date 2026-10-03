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

export default function AdminChatHeader({
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
        <Ionicons name="arrow-back" size={20} color="#ffffff" />
      </Pressable>

      <View style={styles.userInfo}>
        {user ? (
          <>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={28} color="#dc2626" />
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
              <Ionicons name="person" size={28} color="#dc2626" />
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
    backgroundColor: '#7f1d1d',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#991b1b',
    shadowColor: '#7f1d1d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    backgroundColor: '#ffffff',
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
    borderColor: '#7f1d1d',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  typing: {
    fontSize: 14,
    color: '#fecaca',
    fontStyle: 'italic',
    marginTop: 2,
  },
  presence: {
    fontSize: 13,
    color: '#fecaca',
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
    color: '#ffffff',
  },
  placeholderSub: {
    fontSize: 12,
    color: '#fecaca',
    marginTop: 4,
  },
});
