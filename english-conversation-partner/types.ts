export enum Status {
    Idle = 'idle',
    Connecting = 'connecting',
    Listening = 'listening',
    Error = 'error',
}

export interface Message {
    text: string;
    isUser: boolean;
}

export type PracticeMode = 'home' | 'professional' | 'official';
