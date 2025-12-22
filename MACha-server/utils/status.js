export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
}

export const HTTP_STATUS_TEXT = {
    USERNAME_REQUIRED: "Username là bắt buộc.",
    PASSWORD_REQUIRED: "Mật khẩu là bắt buộc.",
    USERNAME_EXISTS: "Username đã tồn tại.",
    LOGIN_SUCCESS: "Đăng nhập thành công.",
    LOGIN_FAILED: "Tên đăng nhập hoặc mật khẩu không hợp lệ.",
    UNAUTHORIZED: "Không xác thực: Token hết hạn hoặc không hợp lệ",
    FORBIDDEN: "Truy cập bị cấm",
    NOT_FOUND: "Không tìm thấy",
}