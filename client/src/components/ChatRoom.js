import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './ChatRoom.css';

const ENDPOINT = 'http://localhost:5000';

const ChatRoom = () => {
    const [socket, setSocket] = useState(null);
    const [nickname, setNickname] = useState('');
    const [room, setRoom] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [pastUsers, setPastUsers] = useState([]);
    const [isJoined, setIsJoined] = useState(false);
    const [saveToDB, setSaveToDB] = useState(true);
    const [fileUploading, setFileUploading] = useState(false);
    const [error, setError] = useState('');
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Initialize socket connection
        const newSocket = io(ENDPOINT, {
            transports: ['websocket'],
            upgrade: false
        });
        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, []); // Only run once on component mount

    useEffect(() => {
        if (!socket) return;

        // Set up socket event listeners
        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('messageHistory', (history) => {
            setMessages(history);
            scrollToBottom();
        });

        socket.on('message', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
            scrollToBottom();
        });

        socket.on('roomData', ({ users, pastUsers, messages: roomMessages }) => {
            setUsers(users);
            setPastUsers(pastUsers);
            setMessages(roomMessages);
        });

        socket.on('roomUsers', ({ users }) => {
            setUsers(users);
        });

        socket.on('fileShared', (fileInfo) => {
            setMessages((prevMessages) => [...prevMessages, {
                type: 'file',
                username: fileInfo.user,
                fileName: fileInfo.fileName,
                fileUrl: `${ENDPOINT}/uploads/${fileInfo.fileName}`
            }]);
        });

        socket.on('error', (error) => {
            setError(error);
            setTimeout(() => setError(null), 5000);
        });

        return () => {
            socket.off('connect');
            socket.off('messageHistory');
            socket.off('message');
            socket.off('roomData');
            socket.off('roomUsers');
            socket.off('fileShared');
            socket.off('error');
        };
    }, [socket]);

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (nickname && socket) {
            const newRoom = Math.random().toString(36).substring(7);
            setRoom(newRoom);
            socket.emit('joinRoom', { 
                username: nickname, 
                room: newRoom,
                persist: saveToDB,
                isCreator: true 
            });
            setIsJoined(true);
        }
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (nickname && room && socket) {
            socket.emit('joinRoom', { 
                username: nickname, 
                room,
                persist: false, // Joiners don't control persistence
                isCreator: false 
            });
            setIsJoined(true);
        }
    };

    const handleMessageSubmit = async (event) => {
        event.preventDefault();
        if (message.trim() && socket) {
            if (message.length > 1000) {
                setError('Message too long');
                return;
            }

            socket.emit('message', {
                room,
                username: nickname,
                text: message,
                persist: saveToDB
            });

            setMessage('');
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !socket) return;
        
        if (file.size > 5 * 1024 * 1024) {
            setError('File size exceeds 5MB limit');
            return;
        }

        setFileUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('room', room);
        formData.append('username', nickname);
        formData.append('persist', saveToDB);

        try {
            const response = await fetch(`${ENDPOINT}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error);
            }

            setFileUploading(false);
        } catch (error) {
            setError('File upload failed');
            setFileUploading(false);
        }
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    if (!isJoined) {
        return (
            <div className="join-container">
                <div className="join-box">
                    <h2>Welcome to Chat</h2>
                    <p>Create or Join a Room</p>
                    <input
                        type="text"
                        placeholder="Your nickname"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Room code (optional)"
                        value={room}
                        onChange={(e) => setRoom(e.target.value)}
                    />
                    {!room && (
                        <div className="persistence-toggle">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={saveToDB}
                                    onChange={(e) => setSaveToDB(e.target.checked)}
                                />
                                Save Messages in Room
                            </label>
                            {!saveToDB && (
                                <span className="toggle-hint">
                                    Messages won't be stored and will be lost when you leave
                                </span>
                            )}
                        </div>
                    )}
                    <div className="button-group">
                        <button onClick={handleCreateRoom}>Create Room</button>
                        <button onClick={handleJoinRoom}>Join Room</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container">
            <div className="chat-sidebar">
                <h3>Room: {room}</h3>
                <h4>Active Users:</h4>
                <ul>
                    {users.map((user, index) => (
                        <li key={index}>{user}</li>
                    ))}
                </ul>
                <h4>Past Users:</h4>
                <ul className="past-users">
                    {pastUsers.map((user, index) => (
                        <li key={index}>{user}</li>
                    ))}
                </ul>
            </div>
            <div className="chat-main">
                <div className="chat-messages">
                    {messages.map((msg, index) => (
                        <div key={index} className="message">
                            {msg.type === 'file' ? (
                                <p>
                                    <span className="user">{msg.username}: </span>
                                    <a 
                                        href={msg.fileUrl ? `${ENDPOINT}${msg.fileUrl}` : '#'} 
                                        download={msg.fileName}
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className={`file-link ${!msg.fileUrl ? 'expired' : ''}`}
                                    >
                                        <span className="file-icon">📎</span>
                                        {msg.text || `Download ${msg.fileName}`}
                                    </a>
                                </p>
                            ) : (
                                <p>
                                    <span className="user">{msg.username}: </span>
                                    <span className="message-text">{msg.text}</span>
                                </p>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div className="chat-form-container">
                    <form onSubmit={handleMessageSubmit}>
                        <input
                            type="text"
                            placeholder="Enter Message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <button type="submit">Send</button>
                    </form>
                    <div className="file-upload">
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            id="file-input"
                            accept="image/*,.pdf,.doc,.docx,.txt"
                            disabled={fileUploading}
                        />
                        <label htmlFor="file-input">
                            <span className="file-icon">📎</span> 
                            {fileUploading ? 'Uploading...' : 'Upload File'}
                        </label>
                    </div>
                    {error && <div className="error-message">{error}</div>}
                </div>
            </div>
        </div>
    );
};

export default ChatRoom; 