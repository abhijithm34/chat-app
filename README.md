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

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/abhijithm34/chat-app.git
cd chat-app
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

4. Start MongoDB service

5. Start the server:
```bash
cd server
npm run dev
```

6. Start the client:
```bash
cd client
npm start
```

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
