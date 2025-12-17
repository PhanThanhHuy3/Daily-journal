import React from 'react';
import { Mood } from '../types';
import { Smile, Frown, Meh, Sun, CloudRain, Zap } from 'lucide-react';

interface MoodBadgeProps {
  mood: Mood;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const MoodBadge: React.FC<MoodBadgeProps> = ({ mood, selected, onClick, size = 'sm' }) => {
  const config = {
    happy: { color: 'bg-green-100 text-green-700 border-green-200', icon: Smile, label: 'Happy' },
    calm: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CloudRain, label: 'Calm' }, // CloudRain for calm/peaceful
    neutral: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Meh, label: 'Neutral' },
    sad: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Frown, label: 'Sad' },
    stressed: { color: 'bg-red-100 text-red-700 border-red-200', icon: Zap, label: 'Stressed' },
    inspired: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Sun, label: 'Inspired' },
  };

  const { color, icon: Icon, label } = config[mood];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 space-x-1',
    md: 'text-sm px-3 py-1.5 space-x-2',
    lg: 'text-base px-4 py-2 space-x-2',
  };

  const interactiveClasses = onClick 
    ? `cursor-pointer hover:opacity-80 transition-all ${selected ? 'ring-2 ring-offset-2 ring-brand-500 scale-105 shadow-md' : 'opacity-70 hover:opacity-100'}` 
    : '';

  return (
    <span 
      onClick={onClick}
      className={`inline-flex items-center rounded-full border font-medium capitalize ${color} ${sizeClasses[size]} ${interactiveClasses}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{label}</span>
    </span>
  );
};