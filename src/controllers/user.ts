import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import * as UserService from '@/services/user';
import ApiError from '@/exceptions/api-error';
import { getCookieOptions } from '@/utils/get-cookie-options';
import {
    IActivateParams,
    IGetActivationLinkParams,
    IRegistrationBody,
} from '@/types/user';

export const registration = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return next(
                ApiError.BadRequest(
                    'SERVER.UserController.registration: Помилка під час валідації',
                    errors.array(),
                ),
            );
        }

        const {
            firstName,
            email,
            password,
            lang,
            guestWishes,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
        }: IRegistrationBody = req.body;

        const userData = await UserService.registration({
            t: req.t,
            reqLang: req.language,
            firstName,
            email,
            password,
            lang,
            guestWishes,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
        });

        res.cookie('refreshToken', userData.refreshToken, getCookieOptions());

        return res.json(userData);
    } catch (error) {
        next(error);
    }
};

export const activate = async (
    req: Request<IActivateParams>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { link } = req.params;
        const activationData = await UserService.activate({
            t: req.t,
            link,
        });

        const redirectUrl = activationData.isActivated
            ? `${process.env.CLIENT_URL}/${activationData.lang}/main`
            : `${process.env.CLIENT_URL}/${activationData.lang}/activation-link-expired`;

        return res.redirect(redirectUrl);
    } catch (error) {
        next(error);
    }
};

export const getActivationLink = async (
    req: Request<IGetActivationLinkParams>,
    res: Response,
    next: NextFunction,
): Promise<Response | void> => {
    try {
        const { userId } = req.params;
        const userEmail = await UserService.generateActivationLink({
            t: req.t,
            reqLang: req.language,
            userId,
        });

        return res.json(userEmail);
    } catch (error) {
        next(error);
    }
};

const googleAuthorization = async (req, res, next) => {
    try {
        const {
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
        } = req.body;
        const userData = await UserService.googleAuthorization(
            req.t,
            req.language,
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
        );

        res.cookie('refreshToken', userData.refreshToken, getCookieOptions());

        return res.json(userData);
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password, lang } = req.body;
        const userData = await UserService.login(req.t, email, password, lang);

        res.cookie('refreshToken', userData.refreshToken, getCookieOptions());

        return res.json(userData);
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;

        const token = await UserService.logout(refreshToken);

        res.clearCookie('refreshToken');

        return res.json(token);
    } catch (error) {
        next(error);
    }
};

const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        const userData = await UserService.refresh(req.t, refreshToken);

        res.cookie('refreshToken', userData.refreshToken, getCookieOptions());

        return res.json(userData);
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email, lang } = req.body;

        const userEmail = await UserService.forgotPassword(
            req.t,
            req.language,
            email,
            lang,
        );

        return res.json(userEmail);
    } catch (error) {
        next(error);
    }
};

const changeForgottenPassword = async (req, res, next) => {
    try {
        const { passwordResetLink, newPassword } = req.body;

        const userEmail = await UserService.changeForgottenPassword(
            req.t,
            passwordResetLink,
            newPassword,
        );

        return res.json(userEmail);
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        const { refreshToken } = req.cookies;

        const token = await UserService.changePassword(
            req.t,
            userId,
            oldPassword,
            newPassword,
            refreshToken,
        );

        res.clearCookie('refreshToken');

        return res.json(token);
    } catch (error) {
        next(error);
    }
};

const changeLang = async (req, res, next) => {
    try {
        const { userId, lang } = req.body;

        const user = await UserService.changeLang(req.t, userId, lang);

        return res.json(user);
    } catch (error) {
        next(error);
    }
};

const deleteMyUser = async (req, res, next) => {
    try {
        const { userId, email, password } = req.body;

        const deletedUserId = await UserService.deleteMyUser(
            userId,
            email,
            req.t,
            password,
        );

        return res.json(deletedUserId);
    } catch (error) {
        next(error);
    }
};

const getUser = async (req, res, next) => {
    try {
        const { userId, myUserId } = req.query;
        const usersData = await UserService.getUser(req.t, userId, myUserId);

        return res.json(usersData);
    } catch (error) {
        next(error);
    }
};

const getUsers = async (req, res, next) => {
    try {
        const { page, limit, myUserId, userType, search } = req.query;
        const usersData = await UserService.getUsers(
            page,
            limit,
            myUserId,
            userType,
            search,
        );

        return res.json(usersData);
    } catch (error) {
        next(error);
    }
};

const getAllUsers = async (req, res, next) => {
    try {
        const { page, limit, search } = req.query;
        const usersData = await UserService.getAllUsers(page, limit, search);

        return res.json(usersData);
    } catch (error) {
        next(error);
    }
};

export default {
    registration,
    activate,
    getActivationLink,
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
