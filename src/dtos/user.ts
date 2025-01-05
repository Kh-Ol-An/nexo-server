import { IUser } from '@/types/user';

export class UserDto {
    id: string;
    email: string;
    hasPassword: boolean;
    isActivated: boolean;
    lang: string;
    firstName: string;
    lastName?: string;
    avatar?: string;
    birthday?: Date;

    constructor(model: IUser) {
        this.id = model._id.toString();
        this.email = model.email;
        this.hasPassword = !!(model.password && model.password.length > 0);
        this.isActivated = model.isActivated;
        this.lang = model.lang;
        this.firstName = model.firstName;
        this.lastName = model.lastName;
        this.avatar = model.avatar;
        this.birthday = model.birthday;
    }
}
