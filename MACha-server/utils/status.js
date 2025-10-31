export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
}

export const HTTP_STATUS_TEXT = {
    USERNAME_REQUIRED: "Username is required.",
    PASSWORD_REQUIRED: "Password is required.",
    USERNAME_EXISTS: "Username already taken.",
    LOGIN_SUCCESS: "Login successful.",
    LOGIN_FAILED: "Invalid username or password.",
    UNAUTHORIZED: "Unauthorized: Invalid or expired token",
    FORBIDDEN: "Forbidden",
    NOT_FOUND: "Not Found",
}