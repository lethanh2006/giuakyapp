import type { Message } from "@/src/services/chat/constant";
import type { User } from "@/src/services/user/constant";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

interface ChatMessagesProps {
  selectedUser: string | null;
  messages: Message[] | null;
  loggedInUser: User | null;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminChatMessages({
  selectedUser,
  messages,
  loggedInUser,
}: ChatMessagesProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const imageSize = Math.min(240, Math.max(120, width * 0.56));

  const uniqueMessages = useMemo(() => {
    if (!messages) return [];
    const seen = new Set<string>();
    return messages.filter((m) => {
      const messageId = String(m._id);
      if (seen.has(messageId)) return false;
      seen.add(messageId);
      return true;
    });
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [selectedUser, uniqueMessages]);

  if (!selectedUser) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Chọn cuộc trò chuyện để bắt đầu</Text>
      </View>
    );
  }

  if (uniqueMessages.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#dc2626" />
        </View>
        <Text style={styles.emptyTitle}>Bắt đầu cuộc trò chuyện</Text>
        <Text style={styles.emptyText}>Gửi lời chào hoặc chia sẻ một hình ảnh.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
    >
      {uniqueMessages.map((msg) => {
        const isMe =
          Boolean(loggedInUser?._id) &&
          String(msg.sender) === String(loggedInUser?._id);
        return (
          <View key={msg._id} style={[styles.msgWrap, isMe ? styles.msgRight : styles.msgLeft]}>
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
              {msg.messageType === 'image' && msg.image && (
                <Image
                  source={{ uri: msg.image.url }}
                  style={[styles.img, { width: imageSize, height: imageSize }]}
                  contentFit="cover"
                  accessibilityLabel="Ảnh trong tin nhắn"
                />
              )}
              {msg.text ? (
                <Text style={[styles.msgText, isMe && styles.msgTextMe]}>
                  {msg.text}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.time, isMe && styles.timeRight]}>
              {formatTime(msg.createdAt)}
              {isMe && (msg.seen ? ' ✓✓' : ' ✓')}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
    paddingBottom: 16,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  emptyTitle: {
    marginTop: 14,
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  msgWrap: {
    marginVertical: 4,
    maxWidth: '82%',
  },
  msgRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  bubbleMe: {
    backgroundColor: '#dc2626',
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  msgText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextMe: {
    color: '#ffffff',
  },
  img: {
    borderRadius: 12,
    marginBottom: 6,
  },
  time: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    marginHorizontal: 4,
  },
  timeRight: {
    marginRight: 8,
  },
});
