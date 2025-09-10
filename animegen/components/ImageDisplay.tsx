
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ImageDisplayProps {
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageUrl, isLoading, error }) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center text-red-400 bg-red-900/50 border border-red-700 p-6 rounded-lg">
        <h3 className="font-bold text-lg mb-2">Generation Failed</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <div className="w-full h-full">
        <img 
          src={imageUrl} 
          alt="Generated anime scene"
          className="w-full h-full object-contain rounded-lg shadow-lg transition-opacity duration-500 opacity-0 animate-fade-in"
          onLoad={(e) => (e.currentTarget.style.opacity = '1')}
        />
        <style>
        {`
          @keyframes fade-in {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
          }
        `}
        </style>
      </div>
    );
  }

  return (
    <div className="text-center text-gray-500 flex flex-col items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <h3 className="font-semibold text-lg">Your masterpiece awaits</h3>
      <p>The generated scene will appear here.</p>
    </div>
  );
};
