import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import uuid from 'uuid';
import UserModel from '../models/user';
import TokenModel from '../models/token';
import CollectionModel from '../models/collection';
import MailService from './mail';
import TokenService from './token';
import { UserDto } from '../dtos/user';
import ApiError from '../exceptions/api-error';
import { LINK_WILL_EXPIRE_IN, WISH_HUB } from '../utils/constants';
import { decryptData } from '../utils/encryption-data';
import {
    IActivateParams,
    IActivateResponse,
    IGetActivationLinkParams,
    IRegistrationBody,
    IRegistrationResponse,
    IUser,
} from '../types/user';
import { IReqLang, ITranslate } from '../types/settings';

export const registration = async ({
    t,
    reqLang,
    firstName,
    email,
    password,
    lang,
}: IRegistrationBody &
    ITranslate &
    IReqLang): Promise<IRegistrationResponse> => {
    // Перевіряємо, чи існує користувач із таким email
    const candidate: IUser | null = await UserModel.findOne({ email });
    if (candidate) {
        throw ApiError.BadRequest(
            t('services.user.registration.unique_email', { email }),
        );
    }

    const decryptedPassword = decryptData(password);
    const hashedPassword = await bcrypt.hash(decryptedPassword, 3);

    // Генеруємо посилання для активації
    const activationLink = uuid.v4();

    // Створюємо користувача
    const user: IUser = await UserModel.create({
        firstName,
        email,
        password: hashedPassword,
        lang,
        activationLink,
        activationLinkExpires: Date.now() + LINK_WILL_EXPIRE_IN,
    });

    // Надсилаємо лист активації
    await MailService.sendActivationMail(
        t,
        reqLang,
        email,
        firstName,
        `${process.env.API_URL}/activate/${activationLink}`,
    );

    // Створюємо DTO для користувача
    const userDto = new UserDto(user);

    // Генеруємо токени
    const payload = {
        userId: userDto.id,
        email: userDto.email,
    };
    const tokens = TokenService.generateToken(payload);

    // Зберігаємо refresh-токен
    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    return {
        ...tokens,
        user: userDto,
    };
};

export const activate = async ({
    t,
    link,
}: ITranslate & IActivateParams): Promise<IActivateResponse> => {
    const user: IUser | null = await UserModel.findOne({
        activationLink: link,
    });
    if (!user) {
        throw ApiError.BadRequest(t('services.user.activate.invalid_link'));
    }

    if (
        user.activationLinkExpires &&
        new Date(user.activationLinkExpires) < new Date()
    ) {
        user.isActivated = false;
        return { isActivated: false, lang: user.lang };
    }

    user.isActivated = true;
    user.activationLink = undefined;
    user.activationLinkExpires = undefined;
    await user.save();

    return { isActivated: true, lang: user.lang };
};

export const generateActivationLink = async ({
    t,
    reqLang,
    userId,
}: IGetActivationLinkParams & ITranslate & IReqLang): Promise<
    IUser['email']
> => {
    const user: IUser | null = await UserModel.findById(
        new mongoose.Types.ObjectId(userId),
    );

    if (!user) {
        throw ApiError.BadRequest(
            t('services.user.generate_activation_link.not_founded_user', {
                id: userId || t('not_found'),
            }),
        );
    }

    if (user.isActivated) {
        return user.email; // Якщо користувач вже активований, повертаємо його email.
    }

    let activationLink = user.activationLink;
    if (!activationLink) {
        activationLink = uuid.v4();
    }

    await MailService.sendActivationMail(
        t,
        reqLang,
        user.email,
        user.firstName,
        `${process.env.API_URL}/activate/${activationLink}`,
    );

    user.isActivated = false;
    user.activationLink = activationLink;
    user.activationLinkExpires = new Date(Date.now() + LINK_WILL_EXPIRE_IN);
    await user.save();

    return user.email;
};

export const deleteInactiveAccounts = async (): Promise<void> => {
    const inactiveAccounts: IUser[] = await UserModel.find({
        isActivated: false,
        activationLinkExpires: { $lt: new Date() },
    });

    for (const account of inactiveAccounts) {
        try {
            await deleteMyUser(null, account._id.toString(), account.email);
        } catch (error) {
            console.error(
                `SERVER.UserService.deleteInactiveAccounts: Не вдалося видалити обліковий запис з ID: ${account._id.toString()}`,
                error,
            );
        }
    }
};

export const deleteExpiredPasswordResetLink = async (): Promise<void> => {
    const accountsWithExpiredLinkPasswordReset: IUser[] = await UserModel.find({
        passwordResetLinkExpires: { $lt: new Date() },
    });

    for (const account of accountsWithExpiredLinkPasswordReset) {
        account.passwordResetLink = undefined;
        account.passwordResetLinkExpires = undefined;
        await account.save();
    }
};

const googleAuthorization = async (
    t,
    reqLang,
    email,
    lang,
    isActivated,
    firstName,
    lastName,
    avatar,
    guestWishes,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
) => {
    const user = await UserModel.findOne({ email });

    if (user) {
        user.lang = lang;
        await user.save();

        const userDto = new UserDto(user);
        const payload = {
            id: userDto.id,
            email: userDto.email,
        };
        const tokens = TokenService.generateToken(payload);
        await TokenService.saveToken(userDto.id, tokens.refreshToken);

        return {
            ...tokens,
            user: userDto,
        };
    }

    const newUser = await UserModel.create({
        email,
        lang,
        firstName:
            firstName.length > 0
                ? firstName
                : t('services.user.google_authorization.user'),
        lastName: lastName.length > 0 ? lastName : undefined,
        avatar: avatar.length > 0 ? avatar : undefined,
        isActivated: !!isActivated,
        activationLink: isActivated ? undefined : uuid.v4(),
        activationLinkExpires: isActivated
            ? undefined
            : Date.now() + LINK_WILL_EXPIRE_IN,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
    });

    if (!isActivated) {
        await MailService.sendActivationMail(
            t,
            reqLang,
            newUser.email,
            newUser.firstName,
            `${process.env.API_URL}/activate/${newUser.activationLink}`,
        );
    }

    const userDto = new UserDto(newUser);
    const payload = {
        id: userDto.id,
        email: userDto.email,
    };
    const tokens = TokenService.generateToken(payload);
    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    const wishDataList = [];
    if (guestWishes && guestWishes.length > 0) {
        const parsedGuestWishes = JSON.parse(guestWishes);

        for (const guestWish of parsedGuestWishes) {
            const wishData = await WishService.createWish(
                t,
                { ...guestWish, userId: newUser._id },
                null,
            );
            wishDataList.push(wishData);
        }
    }

    return {
        ...tokens,
        user: userDto,
        wishes: wishDataList,
    };
};

const login = async (t, email, password, lang) => {
    const user = await UserModel.findOne({ email });
    if (!user) {
        throw ApiError.BadRequest(
            t('services.user.login.not_founded_email', {
                email: email ? email : t('not_found'),
            }),
        );
    }

    const decryptedPassword = decryptData(password);
    const isPassEquals = await bcrypt.compare(decryptedPassword, user.password);
    if (!isPassEquals) {
        throw ApiError.BadRequest(t('services.user.login.invalid_password'));
    }

    user.lang = lang;
    await user.save();

    const userDto = new UserDto(user);
    const payload = {
        id: userDto.id,
        email: userDto.email,
    };
    const tokens = TokenService.generateToken(payload);
    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    return {
        ...tokens,
        user: userDto,
    };
};

const logout = async (refreshToken) => {
    const token = await TokenService.removeToken(refreshToken);
    return token;
};

const refresh = async (t, refreshToken) => {
    if (!refreshToken) {
        throw ApiError.UnauthorizedError(t('not_auth'));
    }

    const userData = TokenService.validateRefreshToken(refreshToken);
    const tokenFromDb = await TokenService.findToken(refreshToken);
    if (!userData || !tokenFromDb) {
        throw ApiError.UnauthorizedError(t('not_auth'));
    }

    const user = await UserModel.findById(userData.id);
    const userDto = new UserDto(user);
    const payload = {
        id: userDto.id,
        email: userDto.email,
    };
    const tokens = TokenService.generateToken(payload);
    await TokenService.saveToken(userDto.id, tokens.refreshToken);

    const usersCount = await UserModel.countDocuments();
    const notActivatedUsersCount = await UserModel.countDocuments({
        isActivated: false,
    });
    const wishesCount = await WishModel.countDocuments();
    const executedWishesCount = await WishModel.countDocuments({
        executed: true,
    });
    const bookedWishesCount = await WishModel.countDocuments({
        'booking.userId': { $exists: true },
    });

    return {
        ...tokens,
        user: userDto,
        adminData: {
            usersCount,
            notActivatedUsersCount,
            wishesCount,
            executedWishesCount,
            bookedWishesCount,
        },
    };
};

const forgotPassword = async (t, reqLang, email, lang) => {
    const user = await UserModel.findOne({ email });
    if (!user) {
        throw ApiError.BadRequest(
            t('services.user.forgot_password.not_founded_email', {
                email: email ? email : t('not_found'),
            }),
        );
    }

    const passwordResetLink = uuid.v4();
    await MailService.sendPasswordResetMail(
        t,
        reqLang,
        email,
        user.firstName,
        `${process.env.CLIENT_URL}/${user.lang}/change-forgotten-password/${passwordResetLink}`,
    );

    user.lang = lang;
    user.passwordResetLink = passwordResetLink;
    user.passwordResetLinkExpires = Date.now() + LINK_WILL_EXPIRE_IN;

    await user.save();

    return user.email;
};

const changeForgottenPassword = async (t, passwordResetLink, newPassword) => {
    const user = await UserModel.findOne({ passwordResetLink });
    if (!user) {
        throw ApiError.BadRequest(
            t('services.user.change_forgotten_password.invalid_link'),
        );
    }

    if (user.passwordResetLinkExpires < Date.now()) {
        throw ApiError.BadRequest(
            t('services.user.change_forgotten_password.expires_link'),
        );
    }

    const decryptedNewPassword = decryptData(newPassword);
    const hashedPassword = await bcrypt.hash(decryptedNewPassword, 3);
    user.password = hashedPassword;

    user.passwordResetLink = undefined;
    user.passwordResetLinkExpires = undefined;

    await user.save();

    return user.email;
};

const changePassword = async (
    t,
    userId,
    oldPassword,
    newPassword,
    refreshToken,
) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw ApiError.BadRequest(
            t('services.user.change_password.not_founded_user', {
                id: userId ? userId : t('not_found'),
            }),
        );
    }

    const decryptedOldPassword = decryptData(oldPassword);
    if (user.password && user.password.length > 0) {
        const isPassEquals = await bcrypt.compare(
            decryptedOldPassword,
            user.password,
        );
        if (!isPassEquals) {
            throw ApiError.BadRequest(
                `SERVER.UserService.changePassword.isPassEquals//${t('services.user.change_password.invalid_old_password')}`,
            );
        }
    }

    const decryptedNewPassword = decryptData(newPassword);
    const hashedPassword = await bcrypt.hash(decryptedNewPassword, 3);
    user.password = hashedPassword;

    await user.save();

    const token = await TokenService.removeToken(refreshToken);
    return token;
};

const changeLang = async (t, userId, lang) => {
    const user = await UserModel.findById(userId);
    if (!user) {
        throw ApiError.BadRequest(
            t('services.user.change_lang.not_founded_user', {
                id: userId ? userId : t('not_found'),
            }),
        );
    }

    user.lang = lang;
    await user.save();

    return new UserDto(user);
};

const deleteMyUser = async (t, userId, email, password) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userToBeDeleted = await UserModel.findOne({ email }).session(
            session,
        );
        if (!userToBeDeleted) {
            throw ApiError.BadRequest(
                t
                    ? t('services.user.delete_my_user.not_founded_email', {
                          email: email ? email : t('not_found'),
                      })
                    : `While deleting the user, we couldn't find a user with the email address: \"${email}\".`,
            );
        }

        if (userToBeDeleted._id.toString() !== userId) {
            throw ApiError.BadRequest(
                t
                    ? t('services.user.delete_my_user.invalid_data')
                    : 'While deleting the user, we found that the provided data is incorrect.',
            );
        }

        if (
            password &&
            userToBeDeleted.password &&
            userToBeDeleted.password.length > 0
        ) {
            const decryptedPassword = decryptData(password);
            const isPassEquals = await bcrypt.compare(
                decryptedPassword,
                userToBeDeleted.password,
            );
            if (!isPassEquals) {
                throw ApiError.BadRequest(
                    t
                        ? t('services.user.delete_my_user.invalid_password')
                        : 'While deleting the user, we found that the provided password is incorrect.',
                );
            }
        }

        // Видалення всіх бажань користувача
        for (const wishId of userToBeDeleted.wishList) {
            await WishService.deleteWish(t, wishId, userId, session);
        }

        // Видалення всіх колекцій користувача
        await CollectionModel.deleteMany({ userId }).session(session);

        // Видалення файлів користувача з Amazon S3
        await AwsService.deleteFile(t, `user-${userId}`);

        // Видалення токена користувача
        await TokenModel.deleteOne({ user: userId }).session(session);

        // Видалення користувача
        const deletedUser =
            await UserModel.findByIdAndDelete(userId).session(session);
        if (!deletedUser) {
            throw ApiError.BadRequest(
                t
                    ? t('services.user.delete_my_user.failed_delete_user', {
                          id: userId ? userId : t('not_found'),
                      })
                    : `Failed to delete the user with the ID: \"${userId}\".`,
            );
        }

        await session.commitTransaction();
        return deletedUser._id;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

const getUser = async (t, userId, myUserId) => {
    // Знайдіть користувача за його ідентифікатором
    const myUser = await UserModel.findById(myUserId);
    if (!myUser) {
        throw ApiError.BadRequest(
            t('services.user.get_user.not_founded_user', {
                id: myUserId ? myUserId : t('not_found'),
            }),
        );
    }

    // Знайдіть користувача за його ідентифікатором
    const user = await UserModel.findById(userId);
    if (!user) {
        throw ApiError.BadRequest(
            t('services.user.get_user.not_founded_user', {
                id: userId ? userId : t('not_found'),
            }),
        );
    }

    return new UserDto(user);
};

const getUsers = async (page, limit, myUserId, userType, search) => {
    let query = {};

    // Додати фільтрацію за типом користувача (userType)
    if (userType !== 'all') {
        switch (userType) {
            case 'friends':
                query = { friends: myUserId };
                break;
            case 'followTo':
                query = { followFrom: myUserId }; // я за ними слідкую
                break;
            case 'followFrom':
                query = { followTo: myUserId }; // вони за мною слідкують
                break;
            default:
                break;
        }
    }

    // Додати пошук за ім'ям
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    // Виключаємо користувача, який робить запит та рекламний акаунт із основного запиту
    query._id = { $nin: [myUserId, WISH_HUB] };

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    // Виконати запит до бази даних
    let users = await UserModel.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

    // Додаємо рекламний акаунт на третю позицію тільки на першій сторінці і якщо немає пошуку
    if (page === 1 && !search) {
        const adUser = await UserModel.findById(WISH_HUB);
        if (adUser) {
            users.splice(2, 0, adUser); // Вставляємо на третю позицію
        }
    }

    const usersDto = users.map((user) => new UserDto(user));

    const followFromCount = await UserModel.countDocuments({
        followTo: myUserId,
    }); // кількість користувачів, які слідкують за мною

    return {
        followFromCount,
        users: usersDto,
    };
};

const getAllUsers = async (page, limit, search) => {
    let query = {};

    // Додати пошук за ім'ям
    if (search) {
        query.$or = [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
        ];
    }

    // Виключити рекламний акаунт із основного запиту
    query._id = { $ne: WISH_HUB };

    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    // Виконати запит до бази даних з лімітом
    let users = await UserModel.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

    // Додаємо рекламний акаунт на третю позицію тільки на першій сторінці і якщо немає пошуку
    if (page === 1 && !search) {
        const adUser = await UserModel.findById(WISH_HUB);
        if (adUser) {
            users.splice(2, 0, adUser); // Вставляємо на третю позицію
        }
    }

    // Перетворюємо користувачів у DTO-об'єкти
    return users.map((user) => new UserDto(user));
};

export default {
    registration,
    activate,
    generateActivationLink,
    deleteInactiveAccounts,
    deleteExpiredPasswordResetLink,
    googleAuthorization,
    login,
    logout,
    refresh,
    forgotPassword,
    changeForgottenPassword,
    changePassword,
    changeLang,
    deleteMyUser,
    getUser,
    getUsers,
    getAllUsers,
};
