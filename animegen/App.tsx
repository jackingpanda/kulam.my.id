import React, { useState, useCallback } from 'react';
import { PromptForm } from './components/PromptForm';
import { ImageDisplay } from './components/ImageDisplay';
import { generateImage } from './services/geminiService';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  const initialPrompt = "An anime scene with bokeh on a rainy Shibuya pedestrian street. The focus is on the wet street with a shallow depth of field (f1.8), capturing the reflections and rain splashes. The camera is at a low angle. The artistic style is inspired by a mix of Makoto Shinkai's stunning realism and dramatic lighting, and Studio Ghibli's charming, hand-painted aesthetic.";

  const handleGenerate = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const imageData = await generateImage(prompt);
      setGeneratedImage(`data:image/jpeg;base64,${imageData}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 transition-colors duration-500">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
            Anime Scene Generator
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Craft your perfect anime moment with the power of AI.
          </p>
        </header>

        <main className="flex flex-col gap-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-6">
            <PromptForm 
              onGenerate={handleGenerate} 
              isLoading={isLoading}
              initialPrompt={initialPrompt}
            />
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-6 min-h-[30rem] flex items-center justify-center">
            <ImageDisplay 
              imageUrl={generatedImage}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </main>

        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Gemini API</p>
        </footer>
      </div>
    </div>
  );
};

export default App;