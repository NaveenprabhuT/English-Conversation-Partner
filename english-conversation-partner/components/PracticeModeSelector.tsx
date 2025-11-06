
import React from 'react';
import { PracticeMode } from '../types';
import { IconHome, IconBriefcase, IconBuilding } from './Icons';

interface PracticeModeSelectorProps {
  currentMode: PracticeMode;
  onSelectMode: (mode: PracticeMode) => void;
  disabled: boolean;
}

// FIX: Used `React.ReactNode` instead of `JSX.Element` to fix the missing JSX namespace error.
const modes: { id: PracticeMode; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <IconHome className="w-5 h-5" /> },
  { id: 'professional', label: 'Professional', icon: <IconBriefcase className="w-5 h-5" /> },
  { id: 'official', label: 'Official', icon: <IconBuilding className="w-5 h-5" /> },
];

const PracticeModeSelector: React.FC<PracticeModeSelectorProps> = ({ currentMode, onSelectMode, disabled }) => {
  return (
    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
      <div className={`grid grid-cols-3 gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-900/50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            disabled={disabled}
            className={`flex items-center justify-center gap-2 p-2 text-sm font-semibold rounded-md transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
              currentMode === mode.id
                ? 'bg-white dark:bg-sky-500 text-sky-600 dark:text-white shadow'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {mode.icon}
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PracticeModeSelector;
