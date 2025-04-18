import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
    const navigate = useNavigate();

    const handleEnterVoid = () => {
        navigate('/chat');
    };

    return (
        <div className="landing-container">
            <div className="landing-content">
                <h1>void</h1>
                <p>"whispers in the void"</p>
                <button className="btn-enter-void" onClick={handleEnterVoid}>
                    Enter Void
                </button>
            </div>
        </div>
    );
};

export default LandingPage; 