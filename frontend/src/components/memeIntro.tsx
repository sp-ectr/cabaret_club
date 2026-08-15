import introVideo from "../assets/oree.mp4";
import { DICTIONARY, type Language } from "../utils/dictionary";

interface MemeIntroProps {
  onComplete: () => void; 
  lang: Language;
}

export function MemeIntro({ onComplete, lang }: MemeIntroProps) {
    return (
         <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden">
            <video
                src={introVideo}
                autoPlay
                playsInline
                preload="auto"
                onEnded={onComplete}
                className="w-full h-full object-contain max-h-screen transform-gpu"
            />
            <button
                onClick={onComplete}
                className="absolute top-6 right-6 z-50 text-[11px] font-mono tracking-widest text-rose-400/60 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/50 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded transition-all active:scale-95"
            >
                {DICTIONARY[lang].skip}
            </button>
         </div>
    );
}