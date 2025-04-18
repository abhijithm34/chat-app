# Void Anonymous Chat

A modern, real-time anonymous chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO. Features a Matrix-style interface and temporary file sharing.

## Key Features

* 🚀 Real-time messaging with Socket.IO
* 🔒 Anonymous room-based chat system
* 👥 User nickname support
* 📁 Temporary file sharing (auto-deleted after 30 minutes)
* 💾 Message persistence in MongoDB
* 🌙 Matrix-inspired dark theme
* 📱 Responsive design for all devices
* 🔄 Past users tracking
* 🗑️ Automatic file cleanup
* 🛡️ Security features with Helmet

## File Sharing Features

* 📎 Support for multiple file types (images, documents, etc.)
* ⏳ Files automatically expire after 30 minutes
* 🔍 File status tracking in chat
* 🧹 Periodic cleanup of expired files
* 💬 System notifications for file expiry

## Tech Stack

* **Frontend**: 
  * React.js
  * Socket.IO Client
  * Modern CSS with animations
* **Backend**: 
  * Node.js
  * Express.js
  * Socket.IO
  * Helmet for security
* **Database**: MongoDB
* **File Storage**: Local file system with auto-cleanup

## Prerequisites

Before installation, ensure you have:
* Node.js (v14 or higher)
* MongoDB Community Edition
* Git

## Installation Guide

### 1. Clone the Repository
```bash
git clone https://github.com/abhijithm34/void-anonymous-chat.git
cd void-anonymous-chat
```

### 2. Server Setup
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install express mongoose cors socket.io helmet dotenv multer --save
npm install nodemon --save-dev

# Create uploads directory
mkdir uploads

# Start the server
npm run dev
```

### 3. Client Setup
```bash
# Navigate to client directory
cd ../client

# Install dependencies
npm install

# Start the client
npm start
```

### 4. MongoDB Setup
1. Start MongoDB service:
   * Windows: Start "MongoDB" service in Services
   * Linux/Mac: `sudo service mongod start`

2. Verify MongoDB is running:
```bash
mongod --version
```

## Usage

1. Open `http://localhost:3000` in your browser
2. Enter a nickname
3. Create a new room or join an existing one
4. Start chatting!

### File Sharing
* Click the upload button to share files
* Files are automatically deleted after 30 minutes
* System notifies when files expire
* Maximum file size: 5MB

## Project Structure
```
void-anonymous-chat/
├── client/                 # React frontend
│   ├── public/            # Static files
│   └── src/              
│       ├── components/    # React components
│       └── App.js         # Main App component
├── server/                # Node.js backend
│   ├── uploads/          # Temporary file storage
│   └── server.js         # Main server file
└── README.md
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /F /PID <PID>

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

2. **MongoDB Connection Issues**:
* Verify MongoDB is running
* Check connection string in server.js
* Ensure proper network access

3. **File Upload Issues**:
* Check uploads directory permissions
* Verify file size limits
* Check browser console for errors

## Security Features

* CORS protection
* Helmet security headers
* Automatic file cleanup
* No permanent file storage
* Anonymous user system

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
