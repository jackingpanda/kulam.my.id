
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CopyIcon, RefreshCwIcon, CheckIcon } from './components/Icons';

const App: React.FC = () => {
  const [email, setEmail] = useState<string>('Click "Generate"');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const generatedNames = useRef(new Set<string>());

  const generateEmail = useCallback(() => {
    const randomName = (length: number): string => {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let name = "";
      for (let i = 0; i < length; i++) {
        name += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return name;
    };

    let name: string;
    do {
      const len = Math.floor(Math.random() * 7) + 4; // length 4–10 for better variety
      name = randomName(len);
    } while (generatedNames.current.has(name));

    generatedNames.current.add(name);
    setEmail(`${name}@kulam.my.id`);
    setIsCopied(false);
  }, []);

  const copyToClipboard = useCallback(() => {
    if (email !== 'Click "Generate"') {
      navigator.clipboard.writeText(email).then(() => {
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      });
    }
  }, [email]);
  
  useEffect(() => {
    // Generate an email on initial load
    generateEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-gray-100 p-4 font-sans">
      <div className="w-full max-w-md mx-auto bg-slate-800/60 rounded-2xl shadow-2xl shadow-cyan-500/10 backdrop-blur-sm border border-slate-700">
        <div className="p-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
            Kulam MailGen
          </h1>
          <p className="text-slate-400 mb-8">
            Your instant, disposable email generator.
          </p>

          <div 
            className="group relative flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6 cursor-pointer transition-all duration-300 hover:border-cyan-400 hover:bg-slate-800"
            onClick={copyToClipboard}
          >
            <span className="text-lg sm:text-xl font-mono text-cyan-300 break-all pr-10">
              {email}
            </span>
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {isCopied ? (
                <CheckIcon className="w-6 h-6 text-green-400" />
              ) : (
                <CopyIcon className="w-6 h-6 text-slate-400 transition-colors duration-300 group-hover:text-cyan-400" />
              )}
            </div>
          </div>
            
          <button
            onClick={generateEmail}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg shadow-cyan-500/20 hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transform transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <RefreshCwIcon className="w-5 h-5" />
            <span>Generate New Email</span>
          </button>
        </div>
      </div>
      
      {isCopied && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-green-500 text-white py-2 px-6 rounded-full shadow-lg animate-bounce">
          Copied to clipboard!
        </div>
      )}

      <footer className="absolute bottom-4 text-slate-500 text-sm">
        <p>
          UI enhanced for Kulam.my.id
        </p>
      </footer>
    </div>
  );
};

export default App;
