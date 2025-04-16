import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@clerk/clerk-react"; // Clerk Auth Hook

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { getToken, isSignedIn } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const connectSocket = async () => {
      if (!isSignedIn) {
        if (socket) socket.disconnect(); // Disconnect if user logs out
        setSocket(null);
        return;
      }

      const token = await getToken(); // Get Clerk token
      const newSocket = io("http://localhost:5000/", {
        auth: { token },
      });

      newSocket.on("connect", () => {
        console.log("✅ Socket connected:", newSocket.id);
      });

      newSocket.on("disconnect", () => {
        console.log("❌ Socket disconnected");
      });

      setSocket(newSocket);
    };

    connectSocket();

    return () => {
      socket?.disconnect(); // Cleanup on unmount
    };
  }, [isSignedIn]); // React when user logs in/out

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
