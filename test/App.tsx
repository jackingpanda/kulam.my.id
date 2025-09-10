
import React, { useState, useEffect } from 'react';
import SmokeCanvas from './components/SmokeCanvas';

// Updated list of high-quality, free fonts from Google Fonts
const fonts = [
  'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Raleway',
  'Playfair Display', 'Merriweather', 'Oswald', 'Nunito', 'Pacifico',
  'Caveat', 'Fira Sans', 'Bebas Neue'
];

const App: React.FC = () => {
  const [currentFont, setCurrentFont] = useState('Montserrat');
  const [currentFontWeight, setCurrentFontWeight] = useState<'normal' | 'bold'>('normal');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Select a new random font from the list
      const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
      setCurrentFont(randomFont);

      // Randomly choose between normal and bold font weight
      const randomWeight = Math.random() > 0.5 ? 'bold' : 'normal';
      setCurrentFontWeight(randomWeight);
    }, 100); // Update every 100 milliseconds

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array ensures this effect runs only once on mount

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timerId);
  }, []);

  const formatTime = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}//${month}//${day} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <SmokeCanvas />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h1
          className="text-white text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-normal select-none"
          style={{ 
            fontFamily: `'${currentFont}', sans-serif`,
            fontWeight: currentFontWeight 
          }}
          aria-live="polite"
        >
          KULAM
        </h1>
      </div>
      <div className="absolute bottom-4 left-4 text-white font-mono text-base pointer-events-none select-none">
        {formatTime(currentTime)}
      </div>
    </div>
  );
};

export default App;