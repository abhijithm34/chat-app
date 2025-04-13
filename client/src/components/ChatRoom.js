import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef();
  const { roomCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state?.nickname) {
      navigate('/');
      return;
    }

    const { nickname } = state;

    // Connect to Socket.IO
    socketRef.current = io(API_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Socket connection event handlers
    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setError(null);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to server. Please try again.');
    });

    // Join room
    socketRef.current.emit('joinRoom', { roomCode, nickname });

    // Load previous messages
    const loadMessages = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/messages/${roomCode}`);
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setError('Failed to load messages. Please refresh the page.');
      }
    };
    loadMessages();

    // Socket event listeners
    socketRef.current.on('newMessage', (message) => {
      console.log('New message received:', message);
      setMessages((prev) => [...prev, message]);
    });

    socketRef.current.on('userJoined', ({ nickname }) => {
      console.log('User joined:', nickname);
      setUsers((prev) => [...prev, nickname]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomCode, state, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    let fileUrl = null;
    let fileType = null;

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await axios.post(`${API_URL}/api/upload`, formData);
        fileUrl = response.data.url;
        fileType = response.data.type;
      } catch (error) {
        console.error('Failed to upload file:', error);
        setError('Failed to upload file. Please try again.');
        return;
      }
    }

    try {
      socketRef.current.emit('sendMessage', {
        roomCode,
        sender: state.nickname,
        content: newMessage,
        fileUrl,
        fileType
      });

      setNewMessage('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const renderMessage = (message) => {
    const isCurrentUser = message.sender === state.nickname;
    
    return (
      <div 
        key={message._id || message.timestamp} 
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
          <div className={`text-xs text-gray-500 mb-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
            {message.sender}
          </div>
          <div className={`rounded-lg p-3 ${isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>
            {message.content && (
              <p className={`${isCurrentUser ? 'text-white' : 'text-gray-800'}`}>
                {message.content}
              </p>
            )}
            {message.fileUrl && (
              <div className="mt-2">
                {message.fileType.startsWith('image/') ? (
                  <img 
                    src={message.fileUrl} 
                    alt="Shared" 
                    className="max-w-full rounded-lg shadow-md"
                  />
                ) : (
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                      isCurrentUser 
                        ? 'bg-white text-indigo-600' 
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    <span className="mr-2">📎</span>
                    Download File
                  </a>
                )}
              </div>
            )}
            <div className={`text-xs mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-gray-500'}`}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background-dark flex">
      {/* Sidebar */}
      <div className="w-64 bg-background-light border-r border-border-color p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Chat Room</h2>
          <span className="text-sm text-text-secondary">{roomCode}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Active Users</h3>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-background-dark transition-colors">
                <div className="w-2 h-2 rounded-full bg-success-color"></div>
                <span className="text-text-primary">{user}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border-color">
          <button
            onClick={() => navigate('/')}
            className="w-full btn btn-secondary"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div 
          ref={messagesEndRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {messages.map((message, index) => {
            const isCurrentUser = message.sender === state.nickname;
            return (
              <div
                key={index}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${isCurrentUser ? 'bg-primary-color' : 'bg-background-light'} rounded-2xl p-3`}>
                  {!isCurrentUser && (
                    <div className="text-xs text-text-secondary mb-1">{message.sender}</div>
                  )}
                  {message.content && (
                    <div className={`text-sm ${isCurrentUser ? 'text-white' : 'text-text-primary'}`}>
                      {message.content}
                    </div>
                  )}
                  {message.fileUrl && (
                    <div className="mt-2">
                      {message.fileType.startsWith('image/') ? (
                        <img
                          src={message.fileUrl}
                          alt="Shared content"
                          className="max-w-full rounded-lg"
                        />
                      ) : (
                        <a
                          href={message.fileUrl}
                          download
                          className="flex items-center space-x-2 text-sm text-primary-light hover:text-primary-color"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span>Download File</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input */}
        <div className="border-t border-border-color p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full input"
              />
            </div>
            <div className="flex space-x-2">
              <label className="btn btn-secondary cursor-pointer">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </label>
              <button type="submit" className="btn btn-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom; 