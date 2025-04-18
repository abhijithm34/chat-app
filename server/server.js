const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());
app.use(helmet.hidePoweredBy());

// CORS configuration
app.use(cors());

// Socket.IO configuration
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

// File cleanup configuration
const FILE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Run cleanup every 5 minutes
const uploadedFiles = new Map(); // Track uploaded files and their expiry timers

// Function to delete file and update database
const deleteFile = async (filename, fileUrl) => {
  try {
    const filePath = path.join(__dirname, 'uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filename}`);
    }
    await Message.updateMany(
      { 'fileUrl': fileUrl },
      { $set: { text: 'File expired (automatically removed after 30 minutes)', fileUrl: null }}
    );
    uploadedFiles.delete(filename);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Function to clean up expired files
const cleanupExpiredFiles = async () => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
      return;
    }

    const files = fs.readdirSync(uploadsDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;

      // If file is older than 30 minutes, delete it
      if (fileAge >= FILE_EXPIRY_TIME) {
        const fileUrl = `/uploads/${file}`;
        await deleteFile(file, fileUrl);
      }
    }
  } catch (error) {
    console.error('Error during file cleanup:', error);
  }
};

// Start periodic cleanup
setInterval(cleanupExpiredFiles, CLEANUP_INTERVAL);

// Run cleanup on startup
cleanupExpiredFiles();

// MongoDB Schema
const MessageSchema = new mongoose.Schema({
  room: String,
  username: String,
  text: String,
  type: { type: String, default: 'text' },
  fileName: String,
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  room: String,
  username: String,
  joinedAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', MessageSchema);
const User = mongoose.model('User', UserSchema);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Store active users
const rooms = new Map();

// Store room persistence settings
const roomPersistence = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', async ({ username, room, persist, isCreator }) => {
    try {
      // Store username in socket for disconnection handling
      socket.username = username;
      
      // Join the room
      socket.join(room);
      
      // If this is the room creator, set the persistence setting
      if (isCreator) {
        roomPersistence.set(room, persist);
      }

      // Add user to the room
      if (!rooms.has(room)) {
        rooms.set(room, new Set());
      }
      rooms.get(room).add(username);

      // Save user to database
      const user = new User({ 
        room, 
        username,
        joinedAt: new Date()
      });
      await user.save();

      // Get ALL past users from MongoDB (not just distinct)
      const pastUsers = await User.find({ room }).sort({ joinedAt: -1 });
      const pastUsernames = pastUsers.map(user => user.username);
      
      // Get message history if persistence is enabled
      let messageHistory = [];
      if (roomPersistence.get(room)) {
        messageHistory = await Message.find({ room }).sort({ createdAt: 1 });
      }

      // Send room data to the joining user
      socket.emit('roomData', {
        users: Array.from(rooms.get(room)),
        pastUsers: pastUsernames,
        messages: messageHistory,
        persist: roomPersistence.get(room)
      });

      // Notify others in the room about the new user
      socket.to(room).emit('roomUsers', {
        users: Array.from(rooms.get(room))
      });

      // Broadcast updated past users list to everyone in the room
      io.to(room).emit('updatePastUsers', {
        pastUsers: pastUsernames
      });

      // Broadcast join message
      io.to(room).emit('message', {
        username: 'System',
        text: `${username} has joined the room`,
        type: 'system',
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', 'Failed to join room');
    }
  });

  socket.on('message', async (data) => {
    try {
      const { room, username, text, type = 'text' } = data;
      
      // Create message object
      const messageData = {
        username,
        text,
        type,
        createdAt: new Date()
      };

      // Save message to MongoDB if persistence is enabled for this room
      if (roomPersistence.get(room)) {
        const message = new Message({
          room,
          ...messageData
        });
        await message.save();
      }

      // Broadcast the message to everyone in the room
      io.to(room).emit('message', messageData);
      
      console.log('Message sent:', messageData); // Debug log
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    try {
      // Remove user from all rooms they were in
      for (const [room, users] of rooms.entries()) {
        if (users.has(socket.username)) {
          users.delete(socket.username);
          
          // Update the room's user list
          io.to(room).emit('roomUsers', {
            users: Array.from(users)
          });

          // Broadcast leave message
          io.to(room).emit('message', {
            username: 'System',
            text: `${socket.username} has left the room`,
            type: 'system',
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  });

  socket.on('join', async ({ nickname, room }) => {
    try {
      socket.join(room);
      
      // Create user record
      const user = new User({
        socketId: socket.id,
        nickname,
        room
      });
      await user.save();

      // Fetch persisted messages for the room
      const messages = await Message.find({ room })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      // Send persisted messages to the joining user
      socket.emit('messageHistory', messages.reverse());

      // Broadcast user list update
      const users = await User.find({ room });
      io.to(room).emit('userList', users);

      // Send welcome message
      socket.emit('message', {
        type: 'system',
        text: `Welcome to ${room}, ${nickname}!`
      });

      // Broadcast join notification
      socket.broadcast.to(room).emit('message', {
        type: 'system',
        text: `${nickname} has joined the room`
      });
    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('error', 'Could not join room');
    }
  });
});

// File upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { room, username, persist } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Save file info to MongoDB if persistence is enabled for this room
    if (roomPersistence.get(room)) {
      const message = new Message({
        room,
        username,
        text: file.originalname,
        type: 'file',
        fileName: file.originalname,
        fileUrl: `/uploads/${file.filename}`,
        createdAt: new Date()
      });
      await message.save();
    }

    // Broadcast the file message to everyone in the room
    io.to(room).emit('message', {
      username,
      text: file.originalname,
      type: 'file',
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      createdAt: new Date()
    });

    res.json({ success: true, fileUrl: `/uploads/${file.filename}` });
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ success: false, error: 'Failed to upload file' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Cleanup on server shutdown
process.on('SIGINT', async () => {
  console.log('\nStarting cleanup before shutdown...');
  
  // Clear all timers
  for (const [filename, { timer }] of uploadedFiles) {
    clearTimeout(timer);
  }
  
  try {
    // Delete all files in uploads directory
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      
      // Update all file messages in the database
      await Message.updateMany(
        { type: 'file', fileUrl: { $ne: null } },
        { $set: { text: 'File removed (server shutdown)', fileUrl: null } }
      );
      
      // Delete all files
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        fs.unlinkSync(filePath);
      }
      
      console.log('All uploaded files cleaned up successfully');
    }
  } catch (error) {
    console.error('Error during shutdown cleanup:', error);
  }
  
  // Close database connection
  try {
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
  
  console.log('Cleanup completed. Shutting down...');
  process.exit(0);
});
