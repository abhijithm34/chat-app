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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', async ({ username, room }) => {
    socket.join(room);

    // Add user to room
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    rooms.get(room).add(username);

    // Save user to database
    const user = new User({ room, username });
    await user.save();

    // Get all users who have ever joined this room
    const pastUsers = await User.find({ room }).sort('-joinedAt');
    const uniquePastUsers = [...new Set(pastUsers.map(u => u.username))];

    // Get previous messages
    const messages = await Message.find({ room }).sort('createdAt');

    // Send room information to the user
    socket.emit('roomData', {
      room,
      users: Array.from(rooms.get(room)),
      pastUsers: uniquePastUsers,
      messages
    });

    // Broadcast to others
    socket.broadcast.to(room).emit('message', {
      username: 'System',
      text: `${username} has joined the chat`
    });

    // Send users and room info
    io.to(room).emit('roomUsers', {
      room,
      users: Array.from(rooms.get(room))
    });
  });

  socket.on('chatMessage', async (message) => {
    const user = Array.from(socket.rooms)[1]; // Get room name
    if (!user) return;

    const messageDoc = new Message({
      room: user,
      username: message.username,
      text: message.text
    });
    await messageDoc.save();

    io.to(user).emit('message', messageDoc);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    rooms.forEach((users, room) => {
      users.forEach(user => {
        if (socket.rooms.has(room)) {
          users.delete(user);
          io.to(room).emit('roomUsers', {
            room,
            users: Array.from(users)
          });
        }
      });
    });
  });
});

// File upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { room, username } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    // Set expiry timer for the file
    const timer = setTimeout(() => {
      deleteFile(req.file.filename, fileUrl);
      
      // Emit file expiry message to the room
      io.to(room).emit('message', {
        type: 'system',
        username: 'System',
        text: `File "${req.file.originalname}" has expired and been removed.`
      });
    }, FILE_EXPIRY_TIME);

    // Track the file and its timer
    uploadedFiles.set(req.file.filename, {
      timer,
      room,
      originalName: req.file.originalname
    });

    const message = new Message({
      room,
      username,
      type: 'file',
      fileName: req.file.originalname,
      fileUrl: fileUrl,
      text: `Shared a file: ${req.file.originalname} (expires in 30 minutes)`
    });
    await message.save();

    // Emit the file message to all users in the room
    io.to(room).emit('message', {
      type: 'file',
      username,
      fileName: req.file.originalname,
      fileUrl: fileUrl,
      text: `Shared a file: ${req.file.originalname} (expires in 30 minutes)`
    });

    res.json({
      success: true,
      fileName: req.file.filename,
      fileUrl: fileUrl
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
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
