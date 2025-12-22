import Router from "express";
import * as AuthController from "../controllers/AuthController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import { rateLimitByEmail, rateLimitByIP, rateLimitByUserId } from "../middlewares/rateLimitMiddleware.js";

const authRoutes = Router();

// Rate limit: 5 requests per 60 seconds per email
authRoutes.post('/signup', rateLimitByEmail(5, 60), AuthController.signup);
authRoutes.post('/login', rateLimitByEmail(5, 60), AuthController.login);
authRoutes.post('/verify-user-account', authMiddleware, rateLimitByUserId(10, 60), AuthController.verifyUserAccount);
// Rate limit: 10 requests per 60 seconds per IP
authRoutes.post('/logout', rateLimitByIP(10, 60), AuthController.logout);

// Rate limit: 20 requests per 60 seconds per user
authRoutes.get('/me', authMiddleware, rateLimitByUserId(20, 60), AuthController.getCurrentUser);
authRoutes.get('/:id', authMiddleware, rateLimitByUserId(20, 60), AuthController.getUserById);
authRoutes.patch('/:id', authMiddleware, rateLimitByUserId(10, 60), checkRole("user", "admin"), AuthController.updateUser)
authRoutes.post('/otp', authMiddleware, rateLimitByUserId(10, 60), AuthController.sendOtp);
authRoutes.post('/verify-otp', authMiddleware, rateLimitByUserId(10, 60), AuthController.verifyOtpChangePassword);
authRoutes.post('/change-password', authMiddleware, rateLimitByUserId(10, 60), AuthController.changePassword);
authRoutes.post('/forgot-password', rateLimitByEmail(5, 60), AuthController.forgotPassword);
/**
 * @swagger
 * components:
 *   schemas:
 *     SignupRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           description: Unique username for the account
 *           example: "john_doe"
 *         email:
 *           type: string
 *           format: email
 *           description: Valid email address
 *           example: "john.doe@example.com"
 *         password:
 *           type: string
 *           minLength: 6
 *           description: Password must be at least 6 characters long
 *           example: "password123"
 *     
 *     SignupResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: User's unique identifier
 *               example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *             username:
 *               type: string
 *               description: User's username
 *               example: "john_doe"
 *             role:
 *               type: string
 *               enum: ["user", "admin", "org"]
 *               description: User's role in the system
 *               example: "user"
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 *           example: "Username or email or password is not blank!"
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user account
 *     description: Creates a new user account with username, email, and password. Returns user information and sets JWT authentication cookie.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *           examples:
 *             valid_signup:
 *               summary: Valid signup request
 *               value:
 *                 username: "john_doe"
 *                 email: "john.doe@example.com"
 *                 password: "password123"
 *             minimal_signup:
 *               summary: Minimal valid request
 *               value:
 *                 username: "jane"
 *                 email: "jane@test.com"
 *                 password: "123456"
 *     responses:
 *       201:
 *         description: User successfully created
 *         headers:
 *           Set-Cookie:
 *             description: JWT authentication cookie
 *             schema:
 *               type: string
 *               example: "jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=259200; Path=/; HttpOnly; Secure; SameSite=None"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignupResponse'
 *             examples:
 *               success_response:
 *                 summary: Successful signup
 *                 value:
 *                   user:
 *                     id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     username: "john_doe"
 *                     role: "user"
 *       400:
 *         description: Bad request - Missing required fields or invalid password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_fields:
 *                 summary: Missing required fields
 *                 value:
 *                   message: "Username or email or password is not blank!"
 *               short_password:
 *                 summary: Password too short
 *                 value:
 *                   message: "Password must be at least 6 characters long."
 *       409:
 *         description: Conflict - Username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               user_exists:
 *                 summary: Username already taken
 *                 value:
 *                   message: "User is existed"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: Server error
 *                 value:
 *                   message: "Internal server error occurred"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "john.doe@example.com"
 *         password:
 *           type: string
 *           description: User's password
 *           example: "password123"
 *     
 *     LoginResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: User's unique identifier
 *               example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *             username:
 *               type: string
 *               description: User's username
 *               example: "john_doe"
 *             role:
 *               type: string
 *               enum: ["user", "admin", "org"]
 *               description: User's role in the system
 *               example: "user"
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user login
 *     description: Authenticates a user with email and password. Returns user information and sets JWT authentication cookie upon successful login.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             valid_login:
 *               summary: Valid login request
 *               value:
 *                 email: "john.doe@example.com"
 *                 password: "password123"
 *             admin_login:
 *               summary: Admin login example
 *               value:
 *                 email: "admin@example.com"
 *                 password: "adminpass123"
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: JWT authentication cookie
 *             schema:
 *               type: string
 *               example: "jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=259200; Path=/; HttpOnly; Secure; SameSite=None"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             examples:
 *               success_response:
 *                 summary: Successful login
 *                 value:
 *                   user:
 *                     id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     username: "john_doe"
 *                     role: "user"
 *               admin_response:
 *                 summary: Admin login success
 *                 value:
 *                   user:
 *                     id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                     username: "admin"
 *                     role: "admin"
 *       400:
 *         description: Bad request - Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_credentials:
 *                 summary: Missing email or password
 *                 value:
 *                   message: "Email and password are required."
 *       401:
 *         description: Unauthorized - Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_credentials:
 *                 summary: Invalid login credentials
 *                 value:
 *                   message: "Invalid username or password."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: Server error
 *                 value:
 *                   message: "Internal server error occurred"
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         avatar:
 *           type: string
 *           description: URL to user's avatar image
 *           example: "https://example.com/new-avatar.jpg"
 *         bio:
 *           type: string
 *           description: User's biography or description
 *           example: "Updated bio: Full-stack developer with passion for AI"
 *         fullname:
 *           type: string
 *           description: User's full name
 *           example: "John Updated Doe"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "john.updated@example.com"
 *       additionalProperties: false
 *     
 *     UpdateUserResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: User's unique identifier
 *               example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *             username:
 *               type: string
 *               description: User's username (cannot be updated)
 *               example: "john_doe"
 *             email:
 *               type: string
 *               format: email
 *               description: User's updated email address
 *               example: "john.updated@example.com"
 *             fullname:
 *               type: string
 *               description: User's updated full name
 *               example: "John Updated Doe"
 *             avatar:
 *               type: string
 *               description: User's updated avatar URL
 *               example: "https://example.com/new-avatar.jpg"
 *             bio:
 *               type: string
 *               description: User's updated biography
 *               example: "Updated bio: Full-stack developer with passion for AI"
 *             date_of_birth:
 *               type: string
 *               format: date
 *               description: User's date of birth (cannot be updated)
 *               example: "1990-01-15"
 *             role:
 *               type: string
 *               enum: ["user", "admin", "org"]
 *               description: User's role (cannot be updated)
 *               example: "user"
 *             createdAt:
 *               type: string
 *               format: date-time
 *               description: Account creation timestamp
 *               example: "2023-07-15T10:30:00.000Z"
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Last update timestamp
 *               example: "2023-07-25T11:20:00.000Z"
 *     
 *     GetCurrentUserResponse:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               description: User's unique identifier
 *               example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *             username:
 *               type: string
 *               description: User's username
 *               example: "john_doe"
 *             email:
 *               type: string
 *               format: email
 *               description: User's email address
 *               example: "john.doe@example.com"
 *             fullname:
 *               type: string
 *               description: User's full name
 *               example: "John Doe"
 *             avatar:
 *               type: string
 *               description: User's avatar URL
 *               example: "https://example.com/avatar.jpg"
 *             bio:
 *               type: string
 *               description: User's biography
 *               example: "Software developer passionate about technology"
 *             date_of_birth:
 *               type: string
 *               format: date
 *               description: User's date of birth
 *               example: "1990-01-15"
 *             role:
 *               type: string
 *               enum: ["user", "admin", "org"]
 *               description: User's role in the system
 *               example: "user"
 *             createdAt:
 *               type: string
 *               format: date-time
 *               description: Account creation timestamp
 *               example: "2023-07-15T10:30:00.000Z"
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Last update timestamp
 *               example: "2023-07-20T14:45:00.000Z"
 *     
 *     LogoutResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Logout success message
 *           example: "Logout successful."
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logs out the current user by clearing the JWT authentication cookie. No request body required.
 *     tags:
 *       - Authentication
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         headers:
 *           Set-Cookie:
 *             description: Clears the JWT authentication cookie
 *             schema:
 *               type: string
 *               example: "jwt=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=None"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 *             examples:
 *               success_response:
 *                 summary: Successful logout
 *                 value:
 *                   message: "Logout successful."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: Server error during logout
 *                 value:
 *                   message: "Internal server error occurred"
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information
 *     description: Retrieves the profile information of the currently authenticated user. Requires a valid JWT token in the Authorization header.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCurrentUserResponse'
 *             examples:
 *               user_profile:
 *                 summary: Regular user profile
 *                 value:
 *                   user:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     username: "john_doe"
 *                     email: "john.doe@example.com"
 *                     fullname: "John Doe"
 *                     avatar: "https://example.com/avatar.jpg"
 *                     bio: "Software developer passionate about technology"
 *                     date_of_birth: "1990-01-15"
 *                     role: "user"
 *                     createdAt: "2023-07-15T10:30:00.000Z"
 *                     updatedAt: "2023-07-20T14:45:00.000Z"
 *               admin_profile:
 *                 summary: Admin user profile
 *                 value:
 *                   user:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e9"
 *                     username: "admin"
 *                     email: "admin@example.com"
 *                     fullname: "System Administrator"
 *                     avatar: null
 *                     bio: ""
 *                     date_of_birth: null
 *                     role: "admin"
 *                     createdAt: "2023-07-01T08:00:00.000Z"
 *                     updatedAt: "2023-07-01T08:00:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_token:
 *                 summary: Missing Authorization header
 *                 value:
 *                   message: "Unauthorized: Invalid or expired token"
 *               invalid_token:
 *                 summary: Invalid JWT token
 *                 value:
 *                   message: "Invalid or expired token"
 *               user_not_found:
 *                 summary: User not found
 *                 value:
 *                   message: "User not found or token invalid"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: Server error
 *                 value:
 *                   message: "Internal server error occurred"
 */

/**
 * @swagger
 * /api/auth/{id}:
 *   get:
 *     summary: Get user information by ID
 *     description: Retrieves the profile information of a specific user by their ID. Requires authentication with a valid JWT token in the Authorization header.
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the user to retrieve
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCurrentUserResponse'
 *             examples:
 *               user_found:
 *                 summary: User found successfully
 *                 value:
 *                   user:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     username: "jane_smith"
 *                     email: "jane.smith@example.com"
 *                     fullname: "Jane Smith"
 *                     avatar: "https://example.com/jane-avatar.jpg"
 *                     bio: "UX Designer with 5 years of experience"
 *                     date_of_birth: "1992-03-20"
 *                     role: "user"
 *                     createdAt: "2023-06-10T09:15:00.000Z"
 *                     updatedAt: "2023-07-18T16:30:00.000Z"
 *               org_user:
 *                 summary: Organization user profile
 *                 value:
 *                   user:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7ea"
 *                     username: "tech_corp"
 *                     email: "contact@techcorp.com"
 *                     fullname: "Tech Corporation"
 *                     avatar: "https://example.com/corp-logo.png"
 *                     bio: "Leading technology solutions provider"
 *                     date_of_birth: null
 *                     role: "org"
 *                     createdAt: "2023-05-01T12:00:00.000Z"
 *                     updatedAt: "2023-07-15T10:45:00.000Z"
 *       400:
 *         description: Bad request - Invalid user ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"User\""
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_token:
 *                 summary: Missing Authorization header
 *                 value:
 *                   message: "Unauthorized: Invalid or expired token"
 *               invalid_token:
 *                 summary: Invalid JWT token
 *                 value:
 *                   message: "Invalid or expired token"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               user_not_found:
 *                 summary: User with specified ID does not exist
 *                 value:
 *                   message: "Not Found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: Database or server error
 *                 value:
 *                   message: "Internal server error occurred"
 */

/**
 * @swagger
 * /api/auth/{id}:
 *   patch:
 *     summary: Update user information by ID
 *     description: Updates specific fields of a user's profile. Users can only update their own profile unless they are admin. Only certain fields are allowed to be updated (avatar, bio, fullname, email).
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the user to update
 *         example: "64a7b8c9d1e2f3a4b5c6d7e8"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *           examples:
 *             partial_update:
 *               summary: Update only some fields
 *               value:
 *                 fullname: "John Updated Doe"
 *                 bio: "Updated bio: Senior developer with 8 years experience"
 *             full_update:
 *               summary: Update all allowed fields
 *               value:
 *                 avatar: "https://example.com/new-avatar.jpg"
 *                 bio: "Full-stack developer passionate about AI and machine learning"
 *                 fullname: "John Alexander Doe"
 *                 email: "john.alexander@example.com"
 *             avatar_only:
 *               summary: Update avatar only
 *               value:
 *                 avatar: "https://cdn.example.com/profile-pics/john-new.png"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateUserResponse'
 *             examples:
 *               successful_update:
 *                 summary: User profile updated
 *                 value:
 *                   user:
 *                     _id: "64a7b8c9d1e2f3a4b5c6d7e8"
 *                     username: "john_doe"
 *                     email: "john.alexander@example.com"
 *                     fullname: "John Alexander Doe"
 *                     avatar: "https://example.com/new-avatar.jpg"
 *                     bio: "Full-stack developer passionate about AI and machine learning"
 *                     date_of_birth: "1990-01-15"
 *                     role: "user"
 *                     createdAt: "2023-07-15T10:30:00.000Z"
 *                     updatedAt: "2023-07-25T11:20:00.000Z"
 *       400:
 *         description: Bad request - Invalid fields or ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_fields:
 *                 summary: Attempting to update forbidden fields
 *                 value:
 *                   message: "Invalid fields: username, password. Allowed fields are: avatar, bio, fullname, email"
 *               invalid_id_format:
 *                 summary: Invalid MongoDB ObjectId format
 *                 value:
 *                   message: "Cast to ObjectId failed for value \"invalid-id\" (type string) at path \"_id\" for model \"User\""
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_token:
 *                 summary: Missing Authorization header
 *                 value:
 *                   message: "Unauthorized: Invalid or expired token"
 *               invalid_token:
 *                 summary: Invalid JWT token
 *                 value:
 *                   message: "Invalid or expired token"
 *       403:
 *         description: Forbidden - User can only update their own profile (unless admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               insufficient_permissions:
 *                 summary: User trying to update another user's profile
 *                 value:
 *                   message: "Forbidden"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               user_not_found:
 *                 summary: User with specified ID does not exist
 *                 value:
 *                   message: "Not Found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 summary: Database or server error
 *                 value:
 *                   message: "Internal server error occurred"
 */

export default authRoutes;