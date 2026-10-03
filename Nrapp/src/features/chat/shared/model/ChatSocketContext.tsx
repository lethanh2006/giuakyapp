import { socketPath, socketUrl } from "@/src/utils/ip";
import { useAuthSession } from "@/src/features/auth/model/AuthSessionContext";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
  isConnected: boolean;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
  isConnected: false,
  connectionError: null,
});

export const ChatSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getToken, user } = useAuthSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const activeSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?._id) return;

    let newSocket: Socket | null = null;
    let cancelled = false;

    const isCurrentSocket = () =>
      !cancelled &&
      newSocket !== null &&
      activeSocketRef.current === newSocket;

    const connect = async () => {
      try {
        newSocket = io(socketUrl, {
          path: socketPath,
          // Socket.IO calls this callback again for every reconnect. Reading the
          // token here prevents reconnects from reusing an access token that the
          // HTTP interceptor has already rotated.
          auth: (callback) => {
            void getToken()
              .then((token) => {
                if (!cancelled) callback({ token: token ?? "" });
              })
              .catch(() => {
                if (!cancelled) callback({ token: "" });
              });
          },
          transports: ["websocket", "polling"],
          autoConnect: false,
        });
        activeSocketRef.current = newSocket;

        newSocket.on("connect_error", (err) => {
          if (!isCurrentSocket()) return;
          setIsConnected(false);
          setConnectionError(err.message);
          console.error("[CHAT][SOCKET_ERROR]", { message: err.message });
        });

        newSocket.on("connect", () => {
          if (!isCurrentSocket()) return;
          setIsConnected(true);
          setConnectionError(null);
          console.log("[CHAT][SOCKET_CONNECTED]", { socketId: newSocket?.id });
        });

        newSocket.on("disconnect", (reason) => {
          if (!isCurrentSocket()) return;
          setIsConnected(false);
          console.log("[CHAT][SOCKET_DISCONNECTED]", { reason });
        });

        newSocket.on("getOnlineUsers", (users: string[]) => {
          if (!isCurrentSocket()) return;
          const normalizedUsers = Array.isArray(users) ? users.map(String) : [];
          console.log("[CHAT][ONLINE_USERS]", { count: normalizedUsers.length });
          setOnlineUsers(normalizedUsers);
        });

        if (cancelled) {
          newSocket.disconnect();
          return;
        }
        setSocket(newSocket);
        newSocket.connect();
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Không thể kết nối realtime";
        setConnectionError(message);
        console.error("[CHAT][SOCKET_INIT_FAILED]", { message });
      }
    };
    void connect();

    return () => {
      cancelled = true;
      if (activeSocketRef.current === newSocket) {
        activeSocketRef.current = null;
        setSocket(null);
        setOnlineUsers([]);
        setIsConnected(false);
        setConnectionError(null);
      }
      newSocket?.disconnect();
      newSocket?.removeAllListeners();
    };
    // A successful HTTP token refresh replaces the user object. Recreating the
    // socket here makes an authentication failure recover without reusing the
    // expired token from the previous connection.
  }, [getToken, user]);

  return (
    <SocketContext.Provider
      value={{ socket, onlineUsers, isConnected, connectionError }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useChatSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useChatSocket must be used within ChatSocketProvider");
  return ctx;
};
