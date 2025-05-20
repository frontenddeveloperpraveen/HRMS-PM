require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { clerkClient, clerkMiddleware, verifyToken } = require("@clerk/express");
const socketHandler = require("./sockets/socketHandler");
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // process.env.FRONTEND_URL || "http://localhost:3000" ||, // Use env variable
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());
app.use(cookieParser());

io.use(async (socket, next) => {
  console.log("🔄 Socket connection attempt...");
  const token = socket.handshake.auth.token;

  console.log(token);

  if (!token) {
    console.error("No token provided");
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    console.log("process.env.CLERK_JWT_KEY", process.env.CLERK_JWT_KEY);
    console.log("Verifying token...");
    const verifiedToken = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_KEY,
      authorizedParties: [
        // process.env.FRONTEND_URL ||
        //   "http://localhost:3000" ||
        //   "http://192.168.137.1:3000",
        //"api.example.com",
        "*",
        // "http://localhost:3000",
      ],
    });

    if (verifiedToken) {
      console.log(`✅ Token verified! User ID: ${verifiedToken.sub}`);
      socket.user = verifiedToken;
      const user = await clerkClient.users.getUser(verifiedToken.sub);
      const role = user.publicMetadata.role;
      socket.role = role;
      switch (role) {
        case "superadmin":
          socket.join("superadmin_room");
      }
      console.log(role);
      console.log(verifiedToken);
      return next();
    } else {
      console.error("Invalid token");
      return next(new Error("Authentication error: Invalid token"));
    }
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return next(new Error("Authentication error: Token verification failed"));
  }
});

io.on("connection", (socket) => {
  console.log(`🔗 User connected: ${socket.user?.sub || "Unknown User"}`);
  socketHandler(io, socket);

  socket.on("disconnect", () => {
    console.log(`🔌 User disconnected: ${socket.user?.sub || "Unknown User"}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
