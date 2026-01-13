import { z } from 'zod';

// Login schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

// Register schema
export const registerSchema = z.object({
  username: z
    .string()
    .min(1, 'Username là bắt buộc')
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(30, 'Username không được vượt quá 30 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ cái, số và dấu gạch dưới'),
  email: z
    .string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 ký tự in hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 ký tự thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số'),
  confirmPassword: z
    .string()
    .min(1, 'Xác nhận mật khẩu là bắt buộc'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
});

export const organizationSignupSchema = z.object({
  organization_name: z
    .string()
    .min(1, 'Tên tổ chức là bắt buộc')
    .min(3, 'Tên tổ chức phải có ít nhất 3 ký tự'),
  username: z
    .string()
    .min(1, 'Username là bắt buộc')
    .min(3, 'Username phải có ít nhất 3 ký tự')
    .max(30, 'Username không được vượt quá 30 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username chỉ được chứa chữ cái, số và dấu gạch dưới'),
  password: z
    .string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 ký tự in hoa')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 ký tự thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 số'),
  confirm_password: z
    .string()
    .min(1, 'Xác nhận mật khẩu là bắt buộc'),
  email: z
    .string()
    .email('Email không hợp lệ')
    .optional()
    .or(z.literal('')),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Mật khẩu không khớp',
  path: ['confirm_password'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type OrganizationSignupFormData = z.infer<typeof organizationSignupSchema>;

