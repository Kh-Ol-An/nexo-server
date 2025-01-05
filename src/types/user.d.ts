import { Document, ObjectId, Schema } from 'mongoose';
import { ELang, EPrivacy } from '@/types/settings';
import { UserDto } from '@/dtos/user';

export interface IRegistrationBody {
    firstName: string;
    email: string;
    password: string;
    lang?: string;
    guestWishes?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
}

export interface IRegistrationResponse {
    user: UserDto;
}

export interface IActivateParams {
    link: string;
}

export interface IActivateResponse {
    isActivated: boolean;
    lang: string;
}

export interface IGetActivationLinkParams {
    userId: string;
}

export interface IUser extends Document {
    _id: ObjectId;
    email: string;
    showEmail: EPrivacy;
    password: string;
    passwordResetLink?: string;
    passwordResetLinkExpires?: Date;
    isActivated: boolean;
    activationLink?: string;
    activationLinkExpires?: Date;
    lang: ELang;
    notificationSubscription?: object;
    quoteNumber: number;
    firstName: string;
    lastName?: string;
    avatar?: string;
    deliveryAddress?: string;
    showDeliveryAddress: EPrivacy;
    birthday?: Date;
    showBirthday: EPrivacy;
    wishList: Schema.Types.ObjectId[];
    successfulWishes: number;
    unsuccessfulWishes: number;
    friends: Schema.Types.ObjectId[];
    followFrom: Schema.Types.ObjectId[];
    followTo: Schema.Types.ObjectId[];
    likedWishes: Schema.Types.ObjectId[];
    dislikedWishes: Schema.Types.ObjectId[];
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    createdAt: Date;
    updatedAt: Date;
}
