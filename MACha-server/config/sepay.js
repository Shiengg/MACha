import { SePayPgClient } from 'sepay-pg-node';
import dotenv from 'dotenv';
dotenv.config();

const merchantId = process.env.SEPAY_MERCHANT_ID;
const secretKey = process.env.SEPAY_SECRET_KEY;

if (!merchantId || !secretKey) {
    console.warn('⚠️  SePay credentials not found. SePay features will be disabled.');
    console.warn('   Please set SEPAY_MERCHANT_ID and SEPAY_SECRET_KEY in .env file');
}

const sepayClient = merchantId && secretKey 
    ? new SePayPgClient({
        env: process.env.SEPAY_ENV || 'sandbox',
        merchant_id: merchantId,
        secret_key: secretKey,
    })
    : null;

export default sepayClient;

