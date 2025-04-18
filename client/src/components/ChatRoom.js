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
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const newSocket = io(ENDPOINT);
        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('message', (message) => {
            setMessages((prevMessages) => [...prevMessages, message]);
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

        return () => {
            socket.off('message');
            socket.off('roomData');
            socket.off('roomUsers');
            socket.off('fileShared');
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (nickname && room) {
            socket.emit('joinRoom', { username: nickname, room });
            setIsJoined(true);
        }
    };

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (nickname) {
            const newRoom = Math.random().toString(36).substring(7);
            setRoom(newRoom);
            socket.emit('joinRoom', { username: nickname, room: newRoom });
            setIsJoined(true);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (message && socket) {
            socket.emit('chatMessage', { username: nickname, text: message });
            setMessage('');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show loading state
        const fileInput = e.target;
        const label = fileInput.nextElementSibling;
        const originalLabelText = label.innerHTML;
        label.innerHTML = '<span class="file-icon">⏳</span> Uploading...';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('room', room);
        formData.append('username', nickname);

        try {
            const response = await fetch(`${ENDPOINT}/upload`, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            // Reset the file input
            fileInput.value = '';
            label.innerHTML = originalLabelText;
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file. Please try again.');
            label.innerHTML = originalLabelText;
        }
    };

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
                                        href={`${ENDPOINT}${msg.fileUrl}`} 
                                        download={msg.fileName}
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="file-link"
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
                    <form onSubmit={sendMessage}>
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
                        />
                        <label htmlFor="file-input">
                            <span className="file-icon">📎</span> Upload File
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatRoom; 