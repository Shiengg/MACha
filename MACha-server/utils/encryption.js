import crypto from 'crypto';

// Lấy encryption key từ environment variable
// Trong production, PHẢI set ENCRYPTION_KEY trong .env
// Key phải là 32 bytes (64 hex characters hoặc 32 character string)
const getEncryptionKey = () => {
    if (process.env.ENCRYPTION_KEY) {
        // Nếu key là hex string, convert sang buffer
        if (process.env.ENCRYPTION_KEY.length === 64) {
            return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
        }
        // Nếu key là string, hash nó để có 32 bytes
        return crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    }
    // Fallback cho development (KHÔNG dùng trong production)
    console.warn('⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY in .env for production!');
    return crypto.scryptSync('default-key-change-in-production', 'salt', 32);
};

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Mã hóa dữ liệu nhạy cảm
 * @param {string} text - Dữ liệu cần mã hóa
 * @returns {string} - Dữ liệu đã mã hóa (dạng base64)
 */
export const encrypt = (text) => {
    if (!text) return null;
    
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        // Kết hợp IV + authTag + encrypted data
        const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
        
        return Buffer.from(combined).toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Giải mã dữ liệu đã mã hóa
 * @param {string} encryptedText - Dữ liệu đã mã hóa (dạng base64)
 * @returns {string} - Dữ liệu đã giải mã
 */
export const decrypt = (encryptedText) => {
    if (!encryptedText) return null;
    
    try {
        const combined = Buffer.from(encryptedText, 'base64').toString('hex');
        const parts = combined.split(':');
        
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        // Nếu không thể decrypt, có thể là dữ liệu cũ chưa được mã hóa
        // Trả về null để xử lý ở layer trên
        return null;
    }
};

/**
 * Kiểm tra xem string có phải là dữ liệu đã mã hóa không
 * @param {string} text - String cần kiểm tra
 * @returns {boolean}
 */
export const isEncrypted = (text) => {
    if (!text) return false;
    try {
        const combined = Buffer.from(text, 'base64').toString('hex');
        return combined.includes(':') && combined.split(':').length === 3;
    } catch {
        return false;
    }
};

