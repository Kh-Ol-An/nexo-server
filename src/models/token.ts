import { Schema, model } from 'mongoose';
import { IToken } from '@/types/token';

const TokenSchema = new Schema<IToken>({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    refreshToken: { type: String, required: true },
});

export default model<IToken>('Token', TokenSchema);
