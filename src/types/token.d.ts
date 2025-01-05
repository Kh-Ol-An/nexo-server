import { Document, ObjectId, Schema } from 'mongoose';

export interface IToken extends Document {
    _id: ObjectId;
    user: Schema.Types.ObjectId;
    refreshToken: string;
}

export interface ITokens {
    accessToken: string;
    refreshToken: string;
}
