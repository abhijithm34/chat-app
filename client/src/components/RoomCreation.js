import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const RoomCreation = () => {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [saveMessages, setSaveMessages] = useState(false);
  const [isCreating, setIsCreating] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/api/rooms', {
        creator: nickname,
        saveMessages
      });
      navigate(`/room/${response.data.roomCode}`, { state: { nickname } });
    } catch (error) {
      console.error('Failed to create room:', error);
      setError('Failed to create room. Please try again.');
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !roomCode.trim()) {
      setError('Please enter both nickname and room code');
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/api/rooms/${roomCode}`);
      if (response.data) {
        navigate(`/room/${roomCode}`, { state: { nickname } });
      }
    } catch (error) {
      console.error('Failed to join room:', error);
      setError('Failed to join room. Please check the room code and try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome to Chat</h1>
          <p className="text-text-secondary">Create or join a room to start chatting</p>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            {error}
          </div>
        )}

        <form onSubmit={isCreating ? handleCreateRoom : handleJoinRoom} className="space-y-6">
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-2">
              Your Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input"
              placeholder="Enter your nickname"
              required
            />
          </div>

          {isCreating ? (
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={saveMessages}
                onChange={(e) => setSaveMessages(e.target.checked)}
                className="w-4 h-4 text-primary-color bg-background-light border-border-color rounded focus:ring-primary-color"
                id="save-messages"
              />
              <label htmlFor="save-messages" className="text-text-secondary">
                Save messages in this room
              </label>
            </div>
          ) : (
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="input"
                placeholder="Enter room code"
                required
              />
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              className="w-full btn btn-primary"
            >
              {isCreating ? 'Create Room' : 'Join Room'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(!isCreating);
                setError(null);
              }}
              className="w-full text-primary-color hover:text-primary-light focus:outline-none transition-colors"
            >
              {isCreating ? 'Join existing room' : 'Create new room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoomCreation; 