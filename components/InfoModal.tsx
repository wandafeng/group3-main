import React, { useState } from 'react';
import { CaughtFish } from '../types';
import { generateFishFact, generateFishRecipe } from '../services/geminiService';

interface InfoModalProps {
  fish: CaughtFish | null;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ fish, onClose }) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'fact' | 'recipe' | null>(null);

  if (!fish) return null;

  const isTrash = fish.type.category === 'trash';
  const borderColor = isTrash ? 'border-red-500' : 'border-blue-500';
  const headerColor = isTrash ? 'bg-red-500' : 'bg-blue-500';

  const handleAsk = async (type: 'fact' | 'recipe') => {
    setLoading(true);
    setActiveTab(type);
    setContent("");
    
    let result = "";
    if (type === 'fact') {
      result = await generateFishFact(fish.type.name);
    } else {
      result = await generateFishRecipe(fish.type.name);
    }
    
    setContent(result);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border-4 ${borderColor}`}>
        <div className={`${headerColor} p-4 flex justify-between items-center text-white`}>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-3xl">{fish.type.emoji}</span> {fish.type.name}
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            你釣到了 {fish.type.name}。 分數: <span className={`font-bold ${isTrash ? 'text-red-600' : 'text-green-600'}`}>{fish.type.score > 0 ? '+' : ''}{fish.type.score} 分</span>。
            {isTrash ? " 下次小心點！" : " 釣得好！"}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => handleAsk('fact')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${activeTab === 'fact' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
            >
              <span className="text-2xl">{isTrash ? '♻️' : '🧠'}</span>
              <span className="font-semibold">{isTrash ? '環保知識' : '生物冷知識'}</span>
            </button>
            <button
              onClick={() => handleAsk('recipe')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${activeTab === 'recipe' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'}`}
            >
              <span className="text-2xl">👨‍🍳</span>
              <span className="font-semibold">{isTrash ? '惡搞食譜' : '美味食譜'}</span>
            </button>
          </div>

          {loading && (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {!loading && content && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-800 leading-relaxed max-h-60 overflow-y-auto">
               {activeTab === 'recipe' ? (
                  <div className="whitespace-pre-line text-sm">{content}</div>
               ) : (
                  <p className="italic">"{content}"</p>
               )}
            </div>
          )}
          
          <div className="mt-4 text-xs text-center text-gray-400">
            Powered by Gemini AI 2.5 Flash
          </div>
        </div>
      </div>
    </div>
  );
};