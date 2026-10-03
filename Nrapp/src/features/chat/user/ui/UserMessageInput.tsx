import {
  resolveChatImageMimeType,
  type ChatImageUpload,
} from "@/src/services/chat/constant";
import { AppAlert as Alert } from "@/src/shared/ui/AppAlert";
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface MessageInputProps {
  selectedUser: string | null;
  message: string;
  setMessage: (v: string) => void;
  handleMessageSend: (image?: ChatImageUpload) => Promise<boolean>;
}

export default function UserMessageInput({
  selectedUser,
  message,
  setMessage,
  handleMessageSend,
}: MessageInputProps) {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);

  const pickImage = async () => {
    try {
      Keyboard.dismiss();
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        selectionLimit: 1,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return;

      const selectedImage = result.assets[0];
      if (selectedImage.fileSize && selectedImage.fileSize > MAX_IMAGE_SIZE) {
        Alert.alert('Ảnh quá lớn', 'Vui lòng chọn ảnh không vượt quá 5 MB.');
        return;
      }
      if (!resolveChatImageMimeType(selectedImage)) {
        Alert.alert(
          'Định dạng chưa hỗ trợ',
          'Vui lòng chọn ảnh JPG, PNG hoặc GIF.',
        );
        return;
      }
      setImage(selectedImage);
    } catch (error) {
      console.error('[CHAT][PICK_IMAGE_FAILED]', error);
      Alert.alert('Lỗi', 'Không thể mở hoặc đọc ảnh đã chọn.');
    }
  };

  const handleSubmit = async () => {
    if ((!message.trim() && !image) || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const sent = await handleMessageSend(
        image
          ? {
              uri: image.uri,
              fileName: image.fileName,
              mimeType: image.mimeType,
              fileSize: image.fileSize,
            }
          : undefined,
      );
      if (sent) setImage(null);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (!selectedUser) return null;

  return (
    <View style={styles.container}>
      {image && (
        <View style={styles.previewWrap}>
          <Image source={{ uri: image.uri }} style={styles.previewImage} />
          <Pressable
            accessibilityLabel="Bỏ ảnh đã chọn"
            accessibilityRole="button"
            hitSlop={8}
            style={styles.removeImage}
            onPress={() => setImage(null)}
          >
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
      )}
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="Chọn ảnh để gửi"
          accessibilityRole="button"
          style={styles.attachButton}
          onPress={pickImage}
          disabled={sending}
        >
          <Ionicons name="image-outline" size={21} color="#2563eb" />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor="#aaaaaa"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />

        <Pressable
          accessibilityLabel="Gửi tin nhắn"
          accessibilityRole="button"
          style={[
            styles.sendBtn,
            (!message.trim() && !image) && styles.sendDisabled,
          ]}
          onPress={handleSubmit}
          disabled={(!message.trim() && !image) || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  previewWrap: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  previewImage: {
    width: 88,
    height: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  removeImage: {
    position: 'absolute',
    right: -7,
    top: -7,
    borderRadius: 14,
    padding: 3,
    backgroundColor: '#ef4444',
  },
  attachButton: {
    padding: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#eff6ff',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  sendBtn: {
    padding: 12,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
});
