const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const Room = require('./models/Room');
const Message = require('./models/Message');
const fs = require('fs');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(helmet.hidePoweredBy());

// CORS configuration for Tor
app.use(cors({
  origin: '*', // Allow all origins for Tor
  methods: ['GET', 'POST'],
  credentials: true
}));

// Socket.IO configuration for Tor
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Generate unique room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// API Routes
app.post('/api/rooms', async (req, res) => {
  try {
    const { creator, saveMessages } = req.body;
    const roomCode = generateRoomCode();
    
    const room = new Room({
      roomCode,
      creator,
      saveMessages
    });
    
    await room.save();
    console.log('Room created:', roomCode);
    res.json({ roomCode });
  } catch (error) {
    console.error('Failed to create room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/api/rooms/:roomCode', async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    console.error('Failed to fetch room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

app.get('/api/messages/:roomCode', async (req, res) => {
  try {
    const messages = await Message.find({ roomCode: req.params.roomCode })
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ 
    url: `/uploads/${req.file.filename}`,
    type: req.file.mimetype
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', async ({ roomCode, nickname }) => {
    try {
      console.log(`User ${nickname} joining room ${roomCode}`);
      socket.join(roomCode);
      io.to(roomCode).emit('userJoined', { nickname });
    } catch (error) {
      console.error('Error joining room:', error);
    }
  });

  socket.on('sendMessage', async ({ roomCode, sender, content, fileUrl, fileType }) => {
    try {
      console.log('New message:', { roomCode, sender, content });
      const room = await Room.findOne({ roomCode });
      
      if (room && room.saveMessages) {
        const message = new Message({
          roomCode,
          sender,
          content,
          fileUrl,
          fileType
        });
        await message.save();
      }

      io.to(roomCode).emit('newMessage', {
        sender,
        content,
        fileUrl,
        fileType,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('To access via Tor:');
  console.log('1. Make sure Tor Browser is running');
  console.log('2. Configure your Tor hidden service');
  console.log('3. Access your .onion address through Tor Browser');
});
