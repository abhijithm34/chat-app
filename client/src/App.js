import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoomCreation from './components/RoomCreation';
import ChatRoom from './components/ChatRoom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background-dark text-text-primary">
        <Routes>
          <Route path="/" element={<RoomCreation />} />
          <Route path="/room/:roomCode" element={<ChatRoom />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
