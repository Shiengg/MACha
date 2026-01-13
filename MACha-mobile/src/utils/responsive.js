import { Dimensions } from 'react-native';

// Lấy kích thước màn hình
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base width (thường dùng iPhone 6/7/8 width làm chuẩn)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 667;

/**
 * Scale kích thước theo chiều rộng màn hình
 * @param {number} size - Kích thước gốc (px)
 * @returns {number} - Kích thước đã scale
 */
export const scale = (size) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale kích thước theo chiều cao màn hình
 * @param {number} size - Kích thước gốc (px)
 * @returns {number} - Kích thước đã scale
 */
export const verticalScale = (size) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Scale kích thước với điều chỉnh vừa phải (tối ưu cho font size)
 * @param {number} size - Kích thước gốc (px)
 * @param {number} factor - Hệ số điều chỉnh (mặc định 0.5)
 * @returns {number} - Kích thước đã scale
 */
export const moderateScale = (size, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};

/**
 * Lấy chiều rộng màn hình
 */
export const screenWidth = SCREEN_WIDTH;

/**
 * Lấy chiều cao màn hình
 */
export const screenHeight = SCREEN_HEIGHT;

/**
 * Tính phần trăm chiều rộng
 * @param {number} percentage - Phần trăm (0-100)
 */
export const widthPercentage = (percentage) => {
  return (SCREEN_WIDTH * percentage) / 100;
};

/**
 * Tính phần trăm chiều cao
 * @param {number} percentage - Phần trăm (0-100)
 */
export const heightPercentage = (percentage) => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

