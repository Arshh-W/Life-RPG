import React, { useState, useEffect } from 'react';
import './App.css'; // Make sure your dark Solo Leveling CSS is imported

const ArcaneOnboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [userData, setUserData] = useState({ profession: '', goal: '' });

  const dialogue = [
    "The realm is shattered. Yet... a new soul approaches the abyss.",
    "I am the watcher of the remnants. Tell me, wanderer... to what craft do you bind your fate?",
    "An intriguing path. And what grand conquest do you seek to achieve before your time runs out?",
    "Your truth is accepted. The Focus Tree awakens. Enter the system..."
  ];

  // Typewriter effect logic
  useEffect(() => {
    let i = 0;
    setDisplayText('');
    const typing = setInterval(() => {
      setDisplayText((prev) => prev + dialogue[step].charAt(i));
      i++;
      if (i === dialogue[step].length) clearInterval(typing);
    }, 40); // 40ms per character for an eerie, deliberate pace

    return () => clearInterval(typing);
  }, [step]);

  const handleInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
      if (step === 1) {
        setUserData({ ...userData, profession: e.target.value });
        setStep(2);
      } else if (step === 2) {
        setUserData({ ...userData, goal: e.target.value });
        setStep(3);
        // Trigger backend authentication & profile creation after a delay
        setTimeout(() => onComplete(userData), 3000); 
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-blue-400 font-mono p-4">
      {/* Shattered Realm Background / Pixel Art Canvas would go here */}
      <div className="max-w-2xl text-center space-y-8 z-10">
        <p className="text-xl md:text-2xl min-h-[4rem] text-shadow-glow">
          {displayText}
        </p>
        
        {step === 0 && (
          <button 
            onClick={() => setStep(1)}
            className="mt-8 px-6 py-2 border border-blue-500 hover:bg-blue-900 transition-colors animate-pulse"
          >
            [ Step Forward ]
          </button>
        )}

        {(step === 1 || step === 2) && (
          <input
            type="text"
            autoFocus
            placeholder={step === 1 ? "e.g., C++ Developer..." : "e.g., Master the backend..."}
            onKeyDown={handleInput}
            className="mt-8 w-full bg-transparent border-b-2 border-blue-500 text-center text-white focus:outline-none focus:border-blue-300 pb-2 text-lg"
          />
        )}
      </div>
    </div>
  );
};

export default ArcaneOnboarding;