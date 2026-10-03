import axios from "@/src/utils/axios";
import { getAuthHeader } from "@/src/utils/apiHelper";
import { ipNR } from "@/src/utils/ip";
import { isAxiosError } from "axios";
import type {
  ChatImageUpload,
  ChatListItem,
  ChatUser,
  Message,
  SupportedChatImageMimeType,
} from "@/src/services/chat/constant";
import { resolveChatImageMimeType } from "@/src/services/chat/constant";

const IMAGE_UPLOAD_TIMEOUT_MS = 60_000;
const API_PREFLIGHT_TIMEOUT_MS = 4_000;
const API_PREFLIGHT_RETRY_DELAY_MS = 400;
const API_PREFLIGHT_ATTEMPTS = 3;

class ChatUploadError extends Error {}

function getApiOrigin() {
  try {
    return new URL(ipNR).origin;
  } catch {
    return ipNR.replace(/\/api(?:\/.*)?$/, "");
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function waitForGateway() {
  let lastError: unknown;

  for (let attempt = 1; attempt <= API_PREFLIGHT_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      API_PREFLIGHT_TIMEOUT_MS,
    );

    try {
      await fetch(`${getApiOrigin()}/health`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < API_PREFLIGHT_ATTEMPTS) {
        await wait(API_PREFLIGHT_RETRY_DELAY_MS);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  console.error("[CHAT][UPLOAD_PREFLIGHT_FAILED]", {
    apiOrigin: getApiOrigin(),
    detail,
  });
  throw new ChatUploadError(
    "Điện thoại chưa kết nối được Gateway. Vui lòng kiểm tra Wi-Fi và thử lại.",
  );
}

function getImageExtension(mimeType: SupportedChatImageMimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

function getImageFileName(
  image: ChatImageUpload,
  mimeType: SupportedChatImageMimeType,
) {
  const extension = getImageExtension(mimeType);
  const originalName = image.fileName?.trim();
  if (!originalName) return `chat-image-${Date.now()}.${extension}`;

  const nameWithoutExtension = originalName.replace(/\.[^.]+$/, "");
  return `${nameWithoutExtension || "chat-image"}.${extension}`;
}

function getSupportedImageMimeType(image: ChatImageUpload) {
  const mimeType = resolveChatImageMimeType(image);
  if (mimeType) return mimeType;
  throw new ChatUploadError(
    "Định dạng ảnh chưa được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc GIF.",
  );
}

async function createImagePayload(
  chatId: string,
  text: string,
  image: ChatImageUpload,
) {
  const form = new FormData();
  form.append("chatId", chatId);
  if (text) form.append("text", text);

  const mimeType = getSupportedImageMimeType(image);
  const fileName = getImageFileName(image, mimeType);

  if (typeof document !== "undefined") {
    const blob = await (await fetch(image.uri)).blob();
    const blobMimeType = blob.type
      ? resolveChatImageMimeType({ mimeType: blob.type })
      : mimeType;
    if (!blobMimeType) {
      throw new ChatUploadError(
        "Định dạng ảnh chưa được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc GIF.",
      );
    }
    form.append("image", blob, getImageFileName(image, blobMimeType));
  } else {
    form.append("image", {
      uri: image.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }

  return form;
}

export async function createChat(token: string, otherUserId: string) {
  return axios.post<{ message: string; chatId: string }>(
    `${ipNR}/chat/chat/new`,
    { otherUserId },
    getAuthHeader(token),
  );
}

export async function getChats(token: string) {
  return axios.get<{ chats: ChatListItem[] }>(
    `${ipNR}/chat/chat/all`,
    getAuthHeader(token),
  );
}

export async function sendChatMessage(
  token: string,
  chatId: string,
  text: string,
  image?: ChatImageUpload,
) {
  if (!image) {
    return axios.post<{ message: Message; sender: string }>(
      `${ipNR}/chat/message`,
      { chatId, text },
      getAuthHeader(token),
    );
  }

  try {
    await waitForGateway();
    return await axios.post<{ message: Message; sender: string }>(
      `${ipNR}/chat/message`,
      await createImagePayload(chatId, text, image),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: IMAGE_UPLOAD_TIMEOUT_MS,
      },
    );
  } catch (error) {
    if (error instanceof ChatUploadError) throw error;

    if (isAxiosError<{ message?: string | string[] }>(error)) {
      if (error.code === "ECONNABORTED") {
        throw new ChatUploadError(
          "Gửi ảnh quá thời gian. Vui lòng kiểm tra kết nối và thử lại.",
        );
      }
      const responseMessage = error.response?.data?.message;
      if (error.response) {
        throw new ChatUploadError(
          (Array.isArray(responseMessage)
            ? responseMessage.join("\n")
            : responseMessage) || "Gửi ảnh không thành công",
        );
      }
    }

    const detail = error instanceof Error ? error.message : String(error);
    console.error("[CHAT][UPLOAD_REQUEST_FAILED]", {
      endpoint: `${ipNR}/chat/message`,
      detail,
      imageMimeType: image.mimeType || "image/jpeg",
      imageUriScheme: image.uri.split(":", 1)[0] || "unknown",
    });
    throw new ChatUploadError(
      "Không thể tải ảnh lên máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
    );
  }
}

export async function getChatMessages(token: string, chatId: string) {
  return axios.get<{
    messages: Message[];
    user: { user?: ChatUser } | ChatUser;
  }>(
    `${ipNR}/chat/message/${encodeURIComponent(chatId)}`,
    getAuthHeader(token),
  );
}
