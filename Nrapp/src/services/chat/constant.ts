import type { User } from "@/src/services/user/constant";

export interface ChatUser {
  _id: string;
  username?: string;
  email?: string;
  role?: string;
  name?: string;
}

export interface ChatImageUpload {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

export const SUPPORTED_CHAT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
] as const;

export type SupportedChatImageMimeType =
  (typeof SUPPORTED_CHAT_IMAGE_MIME_TYPES)[number];

type ChatImageDescriptor = Pick<
  ChatImageUpload,
  "fileName" | "mimeType"
> &
  Partial<Pick<ChatImageUpload, "uri">>;

const CHAT_IMAGE_MIME_TYPE_BY_EXTENSION: Record<
  string,
  SupportedChatImageMimeType
> = {
  gif: "image/gif",
  jfif: "image/jpeg",
  jpe: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
};

export function resolveChatImageMimeType(
  image: ChatImageDescriptor,
): SupportedChatImageMimeType | null {
  const mimeType = image.mimeType?.split(";", 1)[0]?.trim().toLowerCase();
  const normalizedMimeType = mimeType === "image/jpg" ? "image/jpeg" : mimeType;

  if (
    SUPPORTED_CHAT_IMAGE_MIME_TYPES.includes(
      normalizedMimeType as SupportedChatImageMimeType,
    )
  ) {
    return normalizedMimeType as SupportedChatImageMimeType;
  }
  if (normalizedMimeType) return null;

  const sourceName = image.fileName?.trim() || image.uri?.split(/[?#]/, 1)[0];
  const extension = sourceName
    ?.trim()
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/)?.[1];
  return extension ? CHAT_IMAGE_MIME_TYPE_BY_EXTENSION[extension] ?? null : null;
}

export interface ChatRecord {
  _id: string;
  users: string[];
  latestMessage: { text: string; sender: string } | null;
  createdAt: string;
  updatedAt: string;
  unseenCount: number;
}

export interface ChatListItem {
  user: { user?: ChatUser } | ChatUser;
  chat: ChatRecord;
}

export interface Chat {
  _id: string;
  users: string[];
  latestMessage: {
    text: string;
    sender: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  unseenCount?: number;
}

export interface ChatSummary {
  _id: string;
  user: User;
  chat: Chat;
}

export interface Message {
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  image?: { url: string; publicId: string };
  messageType: "text" | "image";
  seen: boolean;
  seenAt?: string;
  createdAt: string;
}
