
import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: Removed non-exported `LiveSession` type.
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { SYSTEM_INSTRUCTION, PRACTICE_MODE_HOME, PRACTICE_MODE_PROFESSIONAL, PRACTICE_MODE_OFFICIAL } from './constants';
import { Status, Message, PracticeMode } from './types';
import { createBlob, decode, decodeAudioData } from './utils/audio';
import ConversationView from './components/ConversationView';
import Controls from './components/Controls';
import PracticeModeSelector from './components/PracticeModeSelector';
import { IconAlertTriangle } from './components/Icons';

const App: React.FC = () => {
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('home');
  const [transcriptionHistory, setTranscriptionHistory] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  // FIX: Use `Promise<any>` for the session promise ref since `LiveSession` is not an exported type.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');
  
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanup = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    if (scriptProcessorRef.current && inputAudioContextRef.current) {
        scriptProcessorRef.current.disconnect(inputAudioContextRef.current.destination);
    }
    if (mediaStreamSourceRef.current && scriptProcessorRef.current) {
        mediaStreamSourceRef.current.disconnect(scriptProcessorRef.current);
    }
    inputAudioContextRef.current?.close().catch(console.error);
    outputAudioContextRef.current?.close().catch(console.error);

    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();

    mediaStreamRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    sessionPromiseRef.current = null;
    
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    nextStartTimeRef.current = 0;

    setStatus(Status.Idle);
  }, []);

  const handleToggleConversation = useCallback(async () => {
    if (status !== Status.Idle) {
      const session = await sessionPromiseRef.current;
      session?.close();
      cleanup();
      return;
    }
    
    setError(null);
    setTranscriptionHistory([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setStatus(Status.Connecting);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // FIX: Cast window to `any` to access vendor-prefixed `webkitAudioContext` for older browsers, preventing TypeScript errors.
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      let finalSystemInstruction = SYSTEM_INSTRUCTION;
      if (practiceMode === 'home') finalSystemInstruction += PRACTICE_MODE_HOME;
      if (practiceMode === 'professional') finalSystemInstruction += PRACTICE_MODE_PROFESSIONAL;
      if (practiceMode === 'official') finalSystemInstruction += PRACTICE_MODE_OFFICIAL;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: finalSystemInstruction,
        },
        callbacks: {
          onopen: () => {
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
            setStatus(Status.Listening);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.turnComplete) {
              const fullInput = currentInputTranscriptionRef.current.trim();
              const fullOutput = currentOutputTranscriptionRef.current.trim();
              if (fullInput) {
                setTranscriptionHistory(prev => [...prev, { text: fullInput, isUser: true }]);
              }
              if (fullOutput) {
                setTranscriptionHistory(prev => [...prev, { text: fullOutput, isUser: false }]);
              }
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                const audioContext = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);

                const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);

                source.addEventListener('ended', () => {
                    audioSourcesRef.current.delete(source);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                audioSourcesRef.current.add(source);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('API Error:', e);
            setError(`An error occurred: ${e.message}. Please try again.`);
            cleanup();
          },
          onclose: () => {
            cleanup();
          },
        },
      });

    } catch (err) {
      if (err instanceof Error) {
        console.error('Mic Error:', err);
        setError(`Could not access microphone: ${err.message}`);
      }
      cleanup();
    }
  }, [status, cleanup, practiceMode]);

  useEffect(() => {
    return () => {
        sessionPromiseRef.current?.then(session => session.close());
        cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center text-slate-800 dark:text-slate-200 p-4 font-sans">
      <div className="w-full max-w-2xl h-[90vh] md:h-[80vh] bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100">English Conversation Partner</h1>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">Practice your English with an AI speaking coach</p>
        </header>

        <PracticeModeSelector 
          currentMode={practiceMode} 
          onSelectMode={setPracticeMode}
          disabled={status !== Status.Idle}
        />

        {error && (
            <div className="m-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-3">
                <IconAlertTriangle className="h-6 w-6"/>
                <span>{error}</span>
            </div>
        )}

        <ConversationView messages={transcriptionHistory} status={status} />

        <footer className="p-4 border-t border-slate-200 dark:border-slate-700 mt-auto">
          <Controls status={status} onToggleConversation={handleToggleConversation} />
        </footer>
      </div>
    </div>
  );
};

export default App;
