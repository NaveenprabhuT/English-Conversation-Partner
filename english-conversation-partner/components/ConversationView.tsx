import React, { useRef, useEffect } from 'react';
import { Message, Status } from '../types';
import { IconUser, IconSparkles } from './Icons';

interface ConversationViewProps {
  messages: Message[];
  status: Status;
}

const ConversationView: React.FC<ConversationViewProps> = ({ messages, status }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <div 
            key={index} 
            className={`flex items-start gap-3 animate-fade-in-up ${message.isUser ? 'justify-end' : ''}`}
            style={{ animation: 'fadeInUp 0.5s ease-in-out forwards' }}
        >
          {!message.isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
              <IconSparkles className="w-5 h-5" />
            </div>
          )}
          <div className={`max-w-md p-3 rounded-2xl shadow-md ${message.isUser ? 'bg-sky-500 text-white rounded-br-none' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
            <p className="text-sm">{message.text}</p>
          </div>
          {message.isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300">
              <IconUser className="w-5 h-5" />
            </div>
          )}
        </div>
      ))}
      {status === Status.Listening && messages.length === 0 && (
        <div className="text-center text-slate-400 dark:text-slate-500 pt-8 animate-pulse">
            <p>I'm listening... Start by saying hello!</p>
        </div>
      )}
      <div ref={endOfMessagesRef} />
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ConversationView;
