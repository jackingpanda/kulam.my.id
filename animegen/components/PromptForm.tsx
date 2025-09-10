
import React, { useState } from 'react';
import { GenerateIcon } from './icons/GenerateIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface PromptFormProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  initialPrompt: string;
}

export const PromptForm: React.FC<PromptFormProps> = ({ onGenerate, isLoading, initialPrompt }) => {
  const [prompt, setPrompt] = useState<string>(initialPrompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
          Describe your scene
        </label>
        <textarea
          id="prompt"
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow duration-200 resize-none placeholder-gray-500"
          placeholder="e.g., A lone samurai watching a cherry blossom storm at night..."
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !prompt.trim()}
        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
      >
        {isLoading ? (
          <>
            <SpinnerIcon />
            Generating...
          </>
        ) : (
          <>
            <GenerateIcon />
            Generate Scene
          </>
        )}
      </button>
    </form>
  );
};
