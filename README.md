# Real-Time Chat Application

A modern, real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO.

## Features

- Real-time messaging
- Room-based chat
- User nicknames
- File sharing (images and documents)
- Message persistence in MongoDB
- Modern UI with dark theme
- Responsive design

## Tech Stack

- **Frontend**: React.js, Socket.IO Client
- **Backend**: Node.js, Express.js, Socket.IO
- **Database**: MongoDB
- **File Storage**: Local file system
- **Styling**: CSS with modern design

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher) - [Download Node.js](https://nodejs.org/)
- MongoDB Community Edition - [Download MongoDB](https://www.mongodb.com/try/download/community)
- Git - [Download Git](https://git-scm.com/downloads)

## Detailed Installation Guide

### Step 1: Clone the Repository
```bash
git clone https://github.com/abhijithm34/chat-app.git
cd chat-app
```

### Step 2: Install Server Dependencies
1. Navigate to the server directory:
```bash
cd server
```

2. Install all required dependencies:
```bash
npm install express mongoose cors socket.io helmet dotenv multer --save
npm install nodemon --save-dev
```

3. Create the uploads directory (required for file storage):
```bash
mkdir uploads
```

### Step 3: Install Client Dependencies
1. Navigate to the client directory:
```bash
cd ../client
```

2. Install all required dependencies:
```bash
npm install
```

### Step 4: Set Up MongoDB
1. Install MongoDB Community Edition if you haven't already
2. Start MongoDB service:
   - On Windows: Open Services and start "MongoDB" service
   - On Linux/Mac: Run `sudo service mongod start`
3. Verify MongoDB is running by opening a new terminal and running:
```bash
mongod --version
```

### Step 5: Start the Application

1. Start the Server:
   - Open a new terminal
   - Navigate to the server directory:
```bash
cd server
```
   - Start the server:
```bash
npm run dev
```
   - The server should start on port 5000
   - You should see "Server running on port 5000" and "Connected to MongoDB" messages

2. Start the Client:
   - Open another new terminal
   - Navigate to the client directory:
```bash
cd client
```
   - Start the client:
```bash
npm start
```
   - The client should start on port 3000
   - Your default browser should automatically open to http://localhost:3000

### Step 6: Troubleshooting Common Issues

1. Port Already in Use (EADDRINUSE):
   - If you see "Error: listen EADDRINUSE: address already in use 127.0.0.1:5000"
   - Find and kill the process using port 5000:
```bash
# On Windows:
netstat -ano | findstr :5000
taskkill /F /PID <process_id>

# On Linux/Mac:
lsof -i :5000
kill -9 <process_id>
```

2. Missing Dependencies:
   - If you see "Cannot find module" errors, run:
```bash
# In server directory:
npm install express mongoose cors socket.io helmet dotenv multer --save

# In client directory:
npm install
```

3. MongoDB Connection Issues:
   - Ensure MongoDB service is running
   - Check if MongoDB is installed correctly
   - Verify MongoDB connection string in server.js

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Create a new room or join an existing one
3. Enter your nickname
4. Start chatting!

## Project Structure

```
chat-app/
├── client/                 # React frontend
│   ├── public/            # Static files
│   └── src/               # Source files
│       ├── components/    # React components
│       └── App.js         # Main App component
├── server/                # Node.js backend
│   ├── models/           # Mongoose models
│   ├── uploads/          # File uploads directory
│   └── server.js         # Main server file
└── README.md             # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
