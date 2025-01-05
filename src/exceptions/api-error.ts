export default class ApiError extends Error {
    public status: number;
    public errors: Array<string | object>;

    constructor(status: number, message: string, errors: Array<string | object> = []) {
        super(message);
        this.status = status;
        this.errors = errors;
        Object.setPrototypeOf(this, ApiError.prototype); // Необхідно для коректної роботи instanceof
    }

    static UnauthorizedError(message: string): ApiError {
        return new ApiError(401, message);
    }

    static BadRequest(message: string, errors: Array<string | object> = []): ApiError {
        return new ApiError(400, message, errors);
    }
}
