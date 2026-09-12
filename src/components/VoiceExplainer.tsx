import React, { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getVoiceExplanation, translations } from '../i18n/translations';

interface VoiceExplainerProps {
  crop: string;
  triggerType: 'below' | 'above';
  threshold: number;
  payout: number;
  verifiedRainfall?: number;
  status?: string;
  compact?: boolean;
}

export const VoiceExplainer: React.FC<VoiceExplainerProps> = ({
  crop,
  triggerType,
  threshold,
  payout,
  verifiedRainfall,
  status,
  compact = false,
}) => {
  const { language } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const t = translations[language];

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const textToSpeak = getVoiceExplanation(
      language,
      crop,
      triggerType,
      threshold,
      payout,
      verifiedRainfall,
      status
    );

    window.speechSynthesis.cancel(); // cancel any active utterance
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Set language voice if available
    utterance.lang = language === 'te' ? 'te-IN' : 'en-IN';
    utterance.rate = 0.95; // slightly slower for better farmer comprehension

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  if (compact) {
    return (
      <button
        onClick={handleSpeak}
        className={`p-2 rounded-lg border transition ${
          isPlaying
            ? 'bg-emerald-600 text-white border-emerald-600 animate-pulse'
            : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
        }`}
        title={isPlaying ? 'Stop Voice' : t.listenPolicy}
      >
        {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
      </button>
    );
  }

  return (
    <button
      onClick={handleSpeak}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition shadow-xs ${
        isPlaying
          ? 'bg-emerald-700 text-white border-emerald-700'
          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
      }`}
    >
      {isPlaying ? (
        <>
          <VolumeX className="w-4 h-4 animate-pulse" />
          <span>{t.speaking} (Stop)</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 text-emerald-600" />
          <span>🔊 {t.listenPolicy}</span>
        </>
      )}
    </button>
  );
};
