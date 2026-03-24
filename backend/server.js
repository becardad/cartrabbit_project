const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat')(io));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/ai', require('./routes/ai'));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-clone')
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log(err));

// Socket.IO
const users = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (userId) => {
    const idStr = String(userId);
    socket.join(idStr);
    users.set(idStr, socket.id);
    console.log(`User ${idStr} joined with socket ${socket.id}`);
    io.emit('online_users', Array.from(users.keys()));
  });

  socket.on('join_group', (groupId) => {
    socket.join(String(groupId));
    console.log(`Socket ${socket.id} joined group ${groupId}`);
  });

  socket.on('disconnect', () => {
    for (let [id, socketId] of users.entries()) {
      if (socketId === socket.id) {
        users.delete(id);
        io.emit('online_users', Array.from(users.keys()));
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });

  socket.on('typing', ({ senderId, receiverId, senderName }) => {
    socket.to(String(receiverId)).emit('typing', { senderId, senderName });
  });

  socket.on('stop_typing', ({ senderId, receiverId }) => {
    socket.to(String(receiverId)).emit('stop_typing', { senderId });
  });

  socket.on('send_message', (message) => {
    const receiverStr = String(message.receiverId);
    const senderStr = String(message.senderId);
    
    // Broadcast to room if it's a group, or personal room if it's direct chat
    socket.to(receiverStr).emit('receive_message', message);

    // Echo back to sender to update their sidebar
    // We use io.to(senderStr) so the sender's other devices receive it
    io.to(senderStr).emit('receive_message', message);
  });

  socket.on('messages_read', ({ readerId, senderId }) => {
    socket.to(String(senderId)).emit('messages_read', { readerId });
  });

  socket.on('delete_message', ({ messageId, receiverId }) => {
    socket.to(String(receiverId)).emit('message_deleted', { messageId });
  });

  socket.on('view_once_opened', ({ messageId, senderId }) => {
    socket.to(String(senderId)).emit('view_once_opened', { messageId });
  });

  socket.on('message_edit', ({ messageId, newText, receiverId }) => {
    socket.to(String(receiverId)).emit('message_edited', { messageId, newText });
  });

  socket.on('message_react', ({ messageId, emoji, userId, receiverId }) => {
    socket.to(String(receiverId)).emit('message_reacted', { messageId, emoji, userId });
  });

  // WebRTC Call Signaling
  socket.on('call_request', ({ to, from, fromName, callType, offer }) => {
    const socketId = users.get(String(to));
    if (socketId) io.to(socketId).emit('call_request', { from, fromName, callType, offer });
  });

  socket.on('call_answer', ({ to, answer }) => {
    const socketId = users.get(String(to));
    if (socketId) io.to(socketId).emit('call_answer', { answer });
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    const socketId = users.get(String(to));
    if (socketId) io.to(socketId).emit('ice_candidate', { candidate });
  });

  socket.on('call_rejected', ({ to }) => {
    const socketId = users.get(String(to));
    if (socketId) io.to(socketId).emit('call_rejected');
  });

  socket.on('call_ended', ({ to }) => {
    const socketId = users.get(String(to));
    if (socketId) io.to(socketId).emit('call_ended');
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
