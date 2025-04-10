const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { Server } = require('socket.io');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

mongoose.connect('mongodb://127.0.0.1:27017/anonchat');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: './server/uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), async (req, res) => {
  const message = new Message({
    type: 'file',
    content: `/uploads/${req.file.filename}`,
  });
  await message.save();
  io.emit('message', message);
  res.status(200).send({ message });
});

app.get('/messages', async (req, res) => {
  const messages = await Message.find().sort({ createdAt: 1 });
  res.json(messages);
});

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('sendMessage', async (data) => {
    const message = new Message({ type: 'text', content: data });
    await message.save();
    io.emit('message', message);
  });
  socket.on('disconnect', () => console.log('User disconnected'));
});

server.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
