import { Schema, model } from 'mongoose';
import { IUser } from '@/types/user';
import { ELang } from '@/types/settings';
import { LINK_WILL_EXPIRE_IN } from '@/utils/constants';

const UserSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    passwordResetLink: { type: String },
    passwordResetLinkExpires: { type: Date },
    isActivated: { type: Boolean, default: false },
    activationLink: { type: String },
    activationLinkExpires: {
        type: Date,
        default: () => new Date(Date.now() + LINK_WILL_EXPIRE_IN),
    },
    lang: { type: String, default: ELang.UA, enum: Object.values(ELang) },
    firstName: { type: String, required: true },
    lastName: { type: String },
    avatar: { type: String },
    birthday: { type: Date },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
});

// Middleware для оновлення `updatedAt` перед збереженням
UserSchema.pre<IUser>('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export default model<IUser>('User', UserSchema);
