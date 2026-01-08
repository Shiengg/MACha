import axios from 'axios';
import FormData from 'form-data';

const FPT_AI_API_KEY = process.env.FPT_AI_API_KEY;
const FPT_OCR_ENDPOINT = process.env.FPT_OCR_ENDPOINT;

const downloadImage = async (imageUrl) => {
    try {
        const response = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 20000
        });
        return Buffer.from(response.data);
    } catch (error) {
        throw new Error(`Failed to download image from ${imageUrl}: ${error.message}`);
    }
}

const base64ToBuffer = (base64String) => {
    try {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
    } catch (error) {
        throw new Error(`Failed to convert base64 to buffer: ${error.message}`);
    }
}

export const ocrCCCD = async (imageUrl) => {
    try {
        console.log('🔵 [FPT AI OCR] Starting OCR process...');
        console.log('📤 [FPT AI OCR] Image URL:', typeof imageUrl === 'string' ? imageUrl.substring(0, 100) + '...' : 'Buffer');
        
        if (!FPT_AI_API_KEY) {
            throw new Error('FPT_AI_API_KEY is not set');
        }

        if (!FPT_OCR_ENDPOINT) {
            throw new Error('FPT_OCR_ENDPOINT is not set');
        }

        console.log('🌐 [FPT AI OCR] Endpoint:', FPT_OCR_ENDPOINT);
        console.log('🔑 [FPT AI OCR] API Key:', FPT_AI_API_KEY ? FPT_AI_API_KEY.substring(0, 10) + '...' : 'NOT SET');

        let imageBuffer;
        if (typeof imageUrl === 'string') {
            const isBase64 = imageUrl.startsWith('data:image') || /^[A-Za-z0-9+/=]+$/.test(imageUrl);
            if (isBase64) {
                console.log('📸 [FPT AI OCR] Processing base64 image...');
                imageBuffer = base64ToBuffer(imageUrl);
            } else {
                console.log('📥 [FPT AI OCR] Downloading image from URL...');
                imageBuffer = await downloadImage(imageUrl);
                console.log('✅ [FPT AI OCR] Image downloaded, size:', imageBuffer.length, 'bytes');
            }
        } else {
            console.log('📦 [FPT AI OCR] Using provided buffer, size:', imageUrl.length, 'bytes');
            imageBuffer = imageUrl;
        }

        const formData = new FormData();
        formData.append('image', imageBuffer, {
            filename: 'cccd.jpg',
            contentType: 'image/jpeg'
        });

        console.log('📨 [FPT AI OCR] Sending request to FPT AI...');
        const requestHeaders = {
            'api-key': FPT_AI_API_KEY,
            ...formData.getHeaders()
        };
        console.log('📋 [FPT AI OCR] Request headers:', {
            'api-key': requestHeaders['api-key'] ? requestHeaders['api-key'].substring(0, 10) + '...' : 'NOT SET',
            'content-type': requestHeaders['content-type']
        });

        const response = await axios.post(FPT_OCR_ENDPOINT, formData, {
            headers: requestHeaders,
            timeout: 20000
        });

        console.log('✅ [FPT AI OCR] Response received');
        console.log('📊 [FPT AI OCR] Response status:', response.status);
        console.log('📦 [FPT AI OCR] Full response data:', JSON.stringify(response.data, null, 2));

        const responseData = response.data;

        // FPT AI returns data in format: { errorCode: 0, data: [{ id: "...", name: "...", ... }] }
        // Need to extract from data[0] if data array exists
        let ocrData = null;
        if (responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
            ocrData = responseData.data[0];
            console.log('✅ [FPT AI OCR] Found data in data[0]:', JSON.stringify(ocrData, null, 2));
        } else {
            // Fallback: try direct access (for different API response format)
            ocrData = responseData;
            console.log('⚠️ [FPT AI OCR] No data array found, using direct responseData');
        }

        const extracted_data = {
            identity_card_number: ocrData.id || ocrData.identity_card_number || ocrData.id_number,
            identity_verified_name: ocrData.name || ocrData.full_name || ocrData.fullname,
            date_of_birth: ocrData.dob || ocrData.date_of_birth || ocrData.birthday,
            gender: ocrData.sex || ocrData.gender,
            nationality: ocrData.nationality || ocrData.quoc_tich,
            address: ocrData.address || ocrData.permanent_address || ocrData.noi_thuong_tru,
            place_of_origin: ocrData.place_of_origin || ocrData.que_quan || ocrData.home,
            expiry_date: ocrData.expiry_date || ocrData.expire_date || ocrData.exp_date || ocrData.doe,
            // Include full OCR data for reference
            ...ocrData,
            // Also include original response structure
            _raw_response: responseData
        };

        console.log('🔍 [FPT AI OCR] Extracted data:');
        console.log('  - Identity Card Number:', extracted_data.identity_card_number || 'NOT FOUND');
        console.log('  - Name:', extracted_data.identity_verified_name || 'NOT FOUND');
        console.log('  - Date of Birth:', extracted_data.date_of_birth || 'NOT FOUND');
        console.log('  - Gender:', extracted_data.gender || 'NOT FOUND');
        console.log('  - Full extracted data keys:', Object.keys(extracted_data));

        return {
            success: true,
            data: responseData,
            extracted_data
        };

    } catch (error) {
        console.error('❌ [FPT AI OCR] Error occurred:');
        console.error('  - Error message:', error.message);
        console.error('  - Error response:', error.response?.data);
        console.error('  - Error status:', error.response?.status);
        console.error('  - Full error:', error);
        throw new Error(`Failed to OCR CCCD: ${error.message}`);
    }
}