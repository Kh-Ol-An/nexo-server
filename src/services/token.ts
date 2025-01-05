import jwt, { JwtPayload } from 'jsonwebtoken';
import TokenModel from '@/models/token';
import { IToken, ITokens } from '@/types/token';

interface ITokenPayload extends JwtPayload {
    userId: string;
    email: string;
}

class Token {
    generateToken(payload: ITokenPayload): ITokens {
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
            expiresIn: '30m',
        });
        const refreshToken = jwt.sign(
            payload,
            process.env.JWT_REFRESH_SECRET!,
            {
                expiresIn: '30d',
            },
        );

        return { accessToken, refreshToken };
    }

    async saveToken(userId: string, refreshToken: string): Promise<IToken> {
        const tokenData = await TokenModel.findOne({ user: userId });
        if (tokenData) {
            tokenData.refreshToken = refreshToken;
            return tokenData.save();
        }
        return TokenModel.create({ user: userId, refreshToken });
    }

    async removeToken(
        refreshToken: string,
    ): Promise<{ deletedCount?: number }> {
        return TokenModel.deleteOne({ refreshToken });
    }

    validateAccessToken(token: string): ITokenPayload | null {
        try {
            return jwt.verify(
                token,
                process.env.JWT_ACCESS_SECRET!,
            ) as ITokenPayload;
        } catch (error) {
            return null;
        }
    }

    validateRefreshToken(token: string): ITokenPayload | null {
        try {
            return jwt.verify(
                token,
                process.env.JWT_REFRESH_SECRET!,
            ) as ITokenPayload;
        } catch (error) {
            return null;
        }
    }

    async findToken(refreshToken: string): Promise<IToken | null> {
        return TokenModel.findOne({ refreshToken });
    }
}

export default new Token();
