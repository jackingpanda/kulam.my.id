
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="text-center text-gray-300">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-purple-500 mx-auto mb-4"></div>
      <h3 className="text-xl font-semibold">Generating Your Scene...</h3>
      <p className="text-gray-400">This may take a moment. The AI is painting your vision.</p>
    </div>
  );
};
