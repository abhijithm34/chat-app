import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5000');  // Change IP for LAN use

function App() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef();

  useEffect(() => {
    axios.get('http://localhost:5000/messages')
      .then(res => setMessages(res.data));

    socket.on('message', msg => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });

    return () => socket.off('message');
  }, []);

  const sendMessage = () => {
    if (text.trim()) {
      socket.emit('sendMessage', text);
      setText('');
    }
  };

  const handleFileChange = async (e) => {
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    await axios.post('http://localhost:5000/upload', formData);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: 'auto' }}>
      <h2>🔐 Anonymous Chat</h2>
      <div style={{ border: '1px solid #ccc', padding: 10, height: 400, overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.type === 'text' ? (
              <p>{msg.content}</p>
            ) : (
              <a href={`http://localhost:5000${msg.content}`} target="_blank" rel="noreferrer">
                📎 File: {msg.content.split('-').pop()}
              </a>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
        placeholder="Type a message"
        style={{ width: '100%', marginTop: 10, padding: 8 }}
      />
      <input type="file" onChange={handleFileChange} style={{ marginTop: 10 }} />
    </div>
  );
}

export default App;
