import React from 'react';
import { Status } from '../types';
import { IconLoader, IconMic, IconPlayerStop, IconAlertCircle } from './Icons';

interface ControlsProps {
  status: Status;
  onToggleConversation: () => void;
}

const Waveform: React.FC = () => (
    <div className="absolute flex items-center justify-center space-x-1 h-16 w-32" aria-hidden="true">
        {[...Array(5)].map((_, i) => (
            <div
                key={i}
                className="w-1 bg-sky-400 rounded-full"
                style={{
                    height: `${Math.random() * 50 + 25}%`,
                    animation: `waveform 1.2s ease-in-out infinite ${i * 0.2}s`,
                }}
            ></div>
        ))}
        <style>{`
            @keyframes waveform {
                0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
                50% { transform: scaleY(1); opacity: 1; }
            }
        `}</style>
    </div>
);

const Controls: React.FC<ControlsProps> = ({ status, onToggleConversation }) => {
  const getButtonContent = () => {
    switch (status) {
      case Status.Idle:
      case Status.Error:
        return { 
          icon: <IconMic className="w-6 h-6" />, 
          text: 'Start Conversation', 
          style: 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white' 
        };
      case Status.Connecting:
        return { 
          icon: <IconLoader className="w-6 h-6 animate-spin" />, 
          text: 'Connecting...', 
          style: 'bg-slate-400 text-white cursor-not-allowed' 
        };
      case Status.Listening:
        return { 
          icon: <IconPlayerStop className="w-6 h-6" />, 
          text: 'Stop Conversation', 
          style: 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white' 
        };
      default:
        return { 
          icon: <IconMic className="w-6 h-6" />, 
          text: 'Start Conversation', 
          style: 'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white' 
        };
    }
  };

  const { icon, text, style } = getButtonContent();

  const getStatusText = () => {
    switch (status) {
        case Status.Idle:
            return "Click 'Start' to begin your practice session.";
        case Status.Connecting:
            return "Connecting to the session...";
        case Status.Listening:
            return "Listening... I'm all ears!";
        case Status.Error:
            return "An error occurred. Please try again.";
        default:
            return "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3 h-24">
        <div className="relative flex items-center justify-center h-16 w-32">
            {status === Status.Listening && <Waveform />}
        </div>
      <button
        onClick={onToggleConversation}
        disabled={status === Status.Connecting}
        className={`w-full max-w-xs flex items-center justify-center space-x-2 px-4 py-3 rounded-full font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-sky-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${style}`}
      >
        {icon}
        <span>{text}</span>
      </button>
      <p className="text-sm text-slate-500 dark:text-slate-400 h-5 text-center">{getStatusText()}</p>
    </div>
  );
};

export default Controls;
