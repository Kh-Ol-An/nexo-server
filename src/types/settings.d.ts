import { ClientSession } from 'mongoose';

export enum ELang {
    UA = 'ua',
    EN = 'en',
    RU = 'ru',
}

export interface ITranslate {
    t: Function;
}

export interface IReqLang {
    reqLang: string;
}

export interface ISession {
    session?: ClientSession | null;
}
