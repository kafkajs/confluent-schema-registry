import * as avsc from 'avsc';

declare module 'avsc' {
    interface AssembleProtocolError extends Error {
        path: string;
    }
}