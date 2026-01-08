import axios from 'axios';
import FormData from 'form-data';

const VNPT_EKYC_BASE_URL = process.env.VNPT_EKYC_BASE_URL || 'https://api.idg.vnpt.vn';
const VNPT_EKYC_TOKEN_ID = process.env.VNPT_EKYC_TOKEN_ID;
const VNPT_EKYC_TOKEN_KEY = process.env.VNPT_EKYC_TOKEN_KEY;
const VNPT_ACCESS_TOKEN = process.env.VNPT_ACCESS_TOKEN;

const generateClientSession = () => {
    const platform = 'WEB';
    const modelName = 'server';
    const osVersion = 'nodejs';
    const deviceType = 'Server';
    const sdkVersion = '1.0.0';
    const deviceId = 'macha-server';
    const timestamp = Date.now();
    return `${platform}_${modelName}_${osVersion}_${deviceType}_${sdkVersion}_${deviceId}_${timestamp}`;
};

const downloadImage = async (imageUrl) => {
    try {
        const response = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000
        });
        return Buffer.from(response.data);
    } catch (error) {
        throw new Error(`Failed to download image from ${imageUrl}: ${error.message}`);
    }
};

const base64ToBuffer = (base64String) => {
    try {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
    } catch (error) {
        throw new Error(`Failed to convert base64 to buffer: ${error.message}`);
    }
};

const prepareImageBuffer = async (imageInput) => {
    if (!imageInput) {
        throw new Error('Image input is required');
    }
    
    if (Buffer.isBuffer(imageInput)) {
        return imageInput;
    }
    
    if (typeof imageInput === 'string') {
        if (imageInput.startsWith('data:image')) {
            return base64ToBuffer(imageInput);
        }
        
        if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
            return await downloadImage(imageInput);
        }
        
        if (/^[A-Za-z0-9+/=]{50,}$/.test(imageInput)) {
            return base64ToBuffer(imageInput);
        }
        
        return await downloadImage(imageInput);
    }
    
    throw new Error(`Invalid image input format: ${typeof imageInput}`);
};

export const uploadImage = async (imageInput, title = 'kyc-document', description = '') => {
    try {
        console.log('🔵 [VNPT eKYC] Đang upload ảnh...');
        console.log('📋 [VNPT eKYC] Image input type:', typeof imageInput);
        console.log('📋 [VNPT eKYC] Image input preview:', typeof imageInput === 'string' ? imageInput.substring(0, 100) + '...' : 'Buffer/Other');
        
        if (!VNPT_EKYC_TOKEN_ID || !VNPT_EKYC_TOKEN_KEY || !VNPT_ACCESS_TOKEN) {
            throw new Error('Chưa cấu hình thông tin xác thực VNPT eKYC');
        }

        const imageBuffer = await prepareImageBuffer(imageInput);
        console.log('✅ [VNPT eKYC] Image buffer prepared, size:', imageBuffer.length, 'bytes');

        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('title', title);
        formData.append('description', description);

        const headers = {
            'Authorization': `Bearer ${VNPT_ACCESS_TOKEN}`,
            'Token-id': VNPT_EKYC_TOKEN_ID,
            'Token-key': VNPT_EKYC_TOKEN_KEY,
            ...formData.getHeaders()
        };

        console.log('📨 [VNPT eKYC] Gửi yêu cầu upload...');
        
        const response = await axios.post(
            `${VNPT_EKYC_BASE_URL}/file-service/v1/addFile`,
            formData,
            {
                headers,
                timeout: 30000
            }
        );

        console.log('✅ [VNPT eKYC] Upload thành công');
        
        const result = response.data;
        
        if (!result.object || !result.object.hash) {
            throw new Error(`Upload thất bại: ${result.message || 'Không nhận được hash'}`);
        }

        return {
            success: true,
            hash: result.object.hash,
            fileName: result.object.fileName,
            fileType: result.object.fileType,
            uploadedDate: result.object.uploadedDate,
            message: result.message
        };

    } catch (error) {
        console.error('❌ [VNPT eKYC] Lỗi upload:', error.message);
        console.error('❌ [VNPT eKYC] Response:', error.response?.data);
        
        return {
            success: false,
            error: error.message,
            message: error.response?.data?.message || error.message
        };
    }
};

export const ocrDocument = async (frontImageHash, backImageHash = null) => {
    try {
        console.log('🔵 [VNPT eKYC] Bắt đầu OCR giấy tờ...');
        
        if (!VNPT_EKYC_TOKEN_ID || !VNPT_EKYC_TOKEN_KEY || !VNPT_ACCESS_TOKEN) {
            throw new Error('Chưa cấu hình thông tin xác thực VNPT eKYC');
        }

        const clientSession = generateClientSession();
        const token = `kyc_${Date.now()}`;

        const requestBody = {
            img_front: frontImageHash,
            client_session: clientSession,
            type: -1,
            validate_postcode: true,
            token: token
        };

        if (backImageHash) {
            requestBody.img_back = backImageHash;
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${VNPT_ACCESS_TOKEN}`,
            'Token-id': VNPT_EKYC_TOKEN_ID,
            'Token-key': VNPT_EKYC_TOKEN_KEY,
            'mac-address': 'MACHA_SERVER'
        };

        console.log('📨 [VNPT eKYC] Gửi yêu cầu OCR...');
        
        const apiUrl = backImageHash 
            ? `${VNPT_EKYC_BASE_URL}/ai/v1/ocr/id`
            : `${VNPT_EKYC_BASE_URL}/ai/v1/ocr/id/front`;
        
        const response = await axios.post(
            apiUrl,
            requestBody,
            {
                headers,
                timeout: 30000
            }
        );

        console.log('✅ [VNPT eKYC] Nhận được kết quả OCR');
        
        const result = response.data;
        
        if (result.message !== 'IDG-00000000') {
            throw new Error(`OCR thất bại: ${result.message}`);
        }

        const object = result.object || {};
        
        const extractedData = {
            identity_card_number: object.id || object.citizen_id,
            identity_verified_name: object.name,
            date_of_birth: object.birth_day,
            gender: object.gender,
            nationality: object.nationality,
            ethnicity: object.nation,
            home_town: object.origin_location,
            address: object.recent_location,
            issue_date: object.issue_date,
            issue_location: object.issue_place,
            expiry_date: object.valid_date,
            card_type: object.card_type,
            post_code: object.post_code,
            address_entities: object.post_code,
            _raw_data: object
        };

        const warnings = object.warning || [];
        const warningMessages = object.warning_msg || [];

        console.log('🔍 [VNPT eKYC] Thông tin trích xuất:');
        console.log('  - Số CMND/CCCD:', extractedData.identity_card_number);
        console.log('  - Họ tên:', extractedData.identity_verified_name);
        console.log('  - Ngày sinh:', extractedData.date_of_birth);

        return {
            success: true,
            message: result.message,
            extracted_data: extractedData,
            confidence: object.name_prob || 0,
            warnings: warnings,
            warning_messages: warningMessages,
            server_version: result.server_version
        };

    } catch (error) {
        console.error('❌ [VNPT eKYC] Lỗi OCR:', error.message);
        console.error('❌ [VNPT eKYC] Response:', error.response?.data);
        
        return {
            success: false,
            error: error.message,
            message: error.response?.data?.message || error.message
        };
    }
};

export const compareFace = async (cardImageHash, faceImageHash) => {
    try {
        console.log('🔵 [VNPT eKYC] Bắt đầu so sánh khuôn mặt...');
        
        if (!VNPT_EKYC_TOKEN_ID || !VNPT_EKYC_TOKEN_KEY || !VNPT_ACCESS_TOKEN) {
            throw new Error('Chưa cấu hình thông tin xác thực VNPT eKYC');
        }

        const clientSession = generateClientSession();
        const token = `face_compare_${Date.now()}`;

        const requestBody = {
            img_front: cardImageHash,
            img_face: faceImageHash,
            client_session: clientSession,
            token: token
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${VNPT_ACCESS_TOKEN}`,
            'Token-id': VNPT_EKYC_TOKEN_ID,
            'Token-key': VNPT_EKYC_TOKEN_KEY,
            'mac-address': 'MACHA_SERVER'
        };

        console.log('📨 [VNPT eKYC] Gửi yêu cầu so sánh khuôn mặt...');
        
        const response = await axios.post(
            `${VNPT_EKYC_BASE_URL}/ai/v1/face/compare`,
            requestBody,
            {
                headers,
                timeout: 30000
            }
        );

        console.log('✅ [VNPT eKYC] Nhận được kết quả so sánh');
        
        const result = response.data;
        
        if (result.message !== 'IDG-00000000') {
            throw new Error(`So sánh khuôn mặt thất bại: ${result.message}`);
        }

        const object = result.object || {};
        const prob = parseFloat(object.prob) || 0;
        const similarity = prob / 100;
        const isMatch = object.msg === 'MATCH';

        console.log('🔍 [VNPT eKYC] Kết quả so sánh:');
        console.log('  - Độ tương đồng:', prob + '%');
        console.log('  - Kết quả:', object.result);

        return {
            success: true,
            message: result.message,
            result: object.result,
            msg: object.msg,
            similarity: similarity,
            probability: prob,
            is_match: isMatch,
            threshold: 75,
            server_version: result.server_version
        };

    } catch (error) {
        console.error('❌ [VNPT eKYC] Lỗi so sánh khuôn mặt:', error.message);
        console.error('❌ [VNPT eKYC] Response:', error.response?.data);
        
        return {
            success: false,
            error: error.message,
            message: error.response?.data?.message || error.message,
            similarity: 0,
            is_match: false
        };
    }
};

export const verifyCardLiveness = async (cardImageHash) => {
    try {
        console.log('🔵 [VNPT eKYC] Kiểm tra giấy tờ thật giả...');
        
        if (!VNPT_EKYC_TOKEN_ID || !VNPT_EKYC_TOKEN_KEY || !VNPT_ACCESS_TOKEN) {
            throw new Error('Chưa cấu hình thông tin xác thực VNPT eKYC');
        }

        const clientSession = generateClientSession();

        const requestBody = {
            img: cardImageHash,
            client_session: clientSession
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${VNPT_ACCESS_TOKEN}`,
            'Token-id': VNPT_EKYC_TOKEN_ID,
            'Token-key': VNPT_EKYC_TOKEN_KEY,
            'mac-address': 'MACHA_SERVER'
        };

        console.log('📨 [VNPT eKYC] Gửi yêu cầu kiểm tra thật giả...');
        
        const response = await axios.post(
            `${VNPT_EKYC_BASE_URL}/ai/v1/card/liveness`,
            requestBody,
            {
                headers,
                timeout: 30000
            }
        );

        console.log('✅ [VNPT eKYC] Nhận được kết quả kiểm tra');
        
        const result = response.data;
        
        if (result.message !== 'IDG-00000000') {
            throw new Error(`Kiểm tra thất bại: ${result.message}`);
        }

        const object = result.object || {};
        const isReal = object.liveness === 'success';

        console.log('🔍 [VNPT eKYC] Kết quả liveness check:');
        console.log('  - Status:', object.liveness);
        console.log('  - Đạt chuẩn:', isReal ? 'CÓ ✅' : 'KHÔNG ⚠️');
        console.log('  - Thông báo:', object.liveness_msg);
        console.log('  - Face swapping:', object.face_swapping);
        console.log('  - Fake liveness:', object.fake_liveness);
        
        if (!isReal) {
            console.log('⚠️ [VNPT eKYC] LƯU Ý: "Không đạt chuẩn" KHÔNG có nghĩa giấy tờ giả!');
            console.log('   Có thể: chụp từ màn hình, photocopy, scan, qua lớp nhựa, hoặc chất lượng kém');
        }

        return {
            success: true,
            message: result.message,
            is_real: isReal,
            liveness: object.liveness,
            liveness_msg: object.liveness_msg,
            face_swapping: object.face_swapping,
            fake_liveness: object.fake_liveness
        };

    } catch (error) {
        console.error('❌ [VNPT eKYC] Lỗi kiểm tra thật giả:', error.message);
        console.error('❌ [VNPT eKYC] Response:', error.response?.data);
        
        return {
            success: false,
            error: error.message,
            message: error.response?.data?.message || error.message,
            is_real: false
        };
    }
};

export const verifyFaceLiveness = async (faceImageHash) => {
    try {
        console.log('🔵 [VNPT eKYC] Kiểm tra mặt thật...');
        
        if (!VNPT_EKYC_TOKEN_ID || !VNPT_EKYC_TOKEN_KEY || !VNPT_ACCESS_TOKEN) {
            throw new Error('Chưa cấu hình thông tin xác thực VNPT eKYC');
        }

        const clientSession = generateClientSession();
        const token = `face_liveness_${Date.now()}`;

        const requestBody = {
            img: faceImageHash,
            client_session: clientSession,
            token: token
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${VNPT_ACCESS_TOKEN}`,
            'Token-id': VNPT_EKYC_TOKEN_ID,
            'Token-key': VNPT_EKYC_TOKEN_KEY,
            'mac-address': 'MACHA_SERVER'
        };

        console.log('📨 [VNPT eKYC] Gửi yêu cầu kiểm tra mặt thật...');
        
        const response = await axios.post(
            `${VNPT_EKYC_BASE_URL}/ai/v1/face/liveness`,
            requestBody,
            {
                headers,
                timeout: 30000
            }
        );

        console.log('✅ [VNPT eKYC] Nhận được kết quả');
        
        const result = response.data;
        
        if (result.message !== 'IDG-00000000') {
            throw new Error(`Kiểm tra mặt thật thất bại: ${result.message}`);
        }

        const object = result.object || {};
        const isLive = object.liveness === 'success';

        console.log('🔍 [VNPT eKYC] Kết quả kiểm tra người thật:');
        console.log('  - Status:', object.liveness);
        console.log('  - Là người thật:', isLive ? '✅ CÓ' : '❌ KHÔNG');
        console.log('  - Thông báo:', object.liveness_msg);
        console.log('  - Mắt mở:', object.is_eye_open);

        return {
            success: true,
            message: result.message,
            is_live: isLive,
            liveness: object.liveness,
            liveness_msg: object.liveness_msg,
            is_eye_open: object.is_eye_open
        };

    } catch (error) {
        console.error('❌ [VNPT eKYC] Lỗi kiểm tra mặt thật:', error.message);
        console.error('❌ [VNPT eKYC] Response:', error.response?.data);
        
        return {
            success: false,
            error: error.message,
            message: error.response?.data?.message || error.message,
            is_live: false
        };
    }
};

export const verifyFullKYC = async (frontImageUrl, backImageUrl, selfieUrl, options = {}) => {
    try {
        console.log('🔵 [VNPT eKYC] Bắt đầu xác thực KYC đầy đủ...');
        
        console.log('📤 [VNPT eKYC] Bước 1: Upload ảnh mặt trước...');
        const frontUpload = await uploadImage(frontImageUrl, 'cccd-front', 'CCCD mặt trước');
        if (!frontUpload.success) {
            return {
                success: false,
                error: 'UPLOAD_FRONT_FAILED',
                message: 'Upload ảnh mặt trước thất bại: ' + frontUpload.message
            };
        }

        let backUpload = null;
        if (backImageUrl) {
            console.log('📤 [VNPT eKYC] Bước 2: Upload ảnh mặt sau...');
            backUpload = await uploadImage(backImageUrl, 'cccd-back', 'CCCD mặt sau');
            if (!backUpload.success) {
                console.warn('⚠️ [VNPT eKYC] Upload ảnh mặt sau thất bại:', backUpload.message);
            }
        }

        console.log('📋 [VNPT eKYC] Bước 3: OCR giấy tờ...');
        const ocrResult = await ocrDocument(
            frontUpload.hash, 
            backUpload?.success ? backUpload.hash : null
        );
        
        if (!ocrResult.success) {
            return {
                success: false,
                error: 'OCR_FAILED',
                message: ocrResult.message,
                ocr_result: ocrResult
            };
        }

        console.log('🔍 [VNPT eKYC] Bước 4: Kiểm tra giấy tờ thật giả...');
        const cardLivenessResult = await verifyCardLiveness(frontUpload.hash);

        let selfieUpload = null;
        let faceCompareResult = null;
        let faceLivenessResult = null;

        if (selfieUrl) {
            console.log('📤 [VNPT eKYC] Bước 5: Upload ảnh chân dung...');
            selfieUpload = await uploadImage(selfieUrl, 'selfie', 'Ảnh chân dung');
            
            if (selfieUpload.success) {
                console.log('👤 [VNPT eKYC] Bước 6: Kiểm tra người thật (Face Liveness)...');
                faceLivenessResult = await verifyFaceLiveness(selfieUpload.hash);

                console.log('🔄 [VNPT eKYC] Bước 7: So sánh khuôn mặt (Face Compare)...');
                faceCompareResult = await compareFace(frontUpload.hash, selfieUpload.hash);
            } else {
                console.warn('⚠️ [VNPT eKYC] Upload ảnh chân dung thất bại:', selfieUpload.message);
            }
        }

        const userInput = options.userInput || {};
        let match = true;
        let mismatchReasons = [];

        if (userInput.identity_card_number) {
            const normalizedOCR = (ocrResult.extracted_data.identity_card_number || '').replace(/\s+/g, '');
            const normalizedInput = (userInput.identity_card_number || '').replace(/\s+/g, '');
            
            if (normalizedOCR !== normalizedInput) {
                match = false;
                mismatchReasons.push('Số CMND/CCCD không khớp');
            }
        }

        if (userInput.identity_verified_name) {
            const normalizedOCR = (ocrResult.extracted_data.identity_verified_name || '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();
            const normalizedInput = (userInput.identity_verified_name || '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();
            
            if (normalizedOCR !== normalizedInput) {
                match = false;
                mismatchReasons.push('Họ tên không khớp');
            }
        }

        const warnings = [];
        
        if (cardLivenessResult.success && !cardLivenessResult.is_real) {
            warnings.push('Chất lượng ảnh giấy tờ chưa đạt chuẩn (có thể chụp từ màn hình/photocopy)');
        }

        if (faceLivenessResult && faceLivenessResult.success && !faceLivenessResult.is_live) {
            match = false;
            mismatchReasons.push('Ảnh chân dung không phải người thật');
        }

        if (faceCompareResult && faceCompareResult.success && !faceCompareResult.is_match) {
            match = false;
            mismatchReasons.push(`Khuôn mặt không khớp (độ tương đồng: ${faceCompareResult.probability.toFixed(1)}%)`);
        }

        const overallConfidence = calculateOverallConfidence(ocrResult, faceCompareResult, cardLivenessResult, faceLivenessResult);

        console.log('✅ [VNPT eKYC] Hoàn thành xác thực KYC');
        console.log('═══════════════════════════════════════════');
        console.log('📋 OCR (Trích xuất thông tin):', ocrResult.success ? '✅ Thành công' : '❌ Thất bại');
        console.log('📄 Card Liveness (Giấy tờ thật):', cardLivenessResult.is_real ? '✅ Thật' : '⚠️ Không đạt chuẩn');
        console.log('👤 Face Liveness (Người thật):', faceLivenessResult?.is_live ? '✅ Là người thật' : (faceLivenessResult ? '❌ Không phải người thật' : 'N/A'));
        console.log('🔄 Face Compare (Khuôn mặt khớp):', faceCompareResult?.is_match ? `✅ Khớp (${faceCompareResult.probability.toFixed(1)}%)` : (faceCompareResult ? `❌ Không khớp (${faceCompareResult.probability.toFixed(1)}%)` : 'N/A'));
        console.log('✓  Dữ liệu khớp:', match ? '✅' : '❌');
        if (warnings.length > 0) {
            console.log('⚠️  Cảnh báo:', warnings.join(', '));
        }
        console.log('📊 Độ tin cậy tổng:', (overallConfidence * 100).toFixed(1) + '%');
        console.log('🎯 Khuyến nghị:', recommendation);
        console.log('═══════════════════════════════════════════');

        let recommendation = 'MANUAL_REVIEW';
        if (match && overallConfidence >= 0.85 && warnings.length === 0) {
            recommendation = 'APPROVE';
        } else if (match && overallConfidence >= 0.7 && warnings.length <= 1) {
            recommendation = 'MANUAL_REVIEW';
        } else if (!match) {
            recommendation = 'REJECT';
        }

        return {
            success: true,
            match: match,
            mismatch_reasons: mismatchReasons,
            warnings: warnings,
            ocr_result: ocrResult,
            card_liveness_result: cardLivenessResult,
            face_liveness_result: faceLivenessResult,
            face_compare_result: faceCompareResult,
            confidence: overallConfidence,
            extracted_data: ocrResult.extracted_data,
            recommendation: recommendation
        };

    } catch (error) {
        console.error('❌ [VNPT eKYC] Lỗi xác thực KYC:', error.message);
        
        return {
            success: false,
            error: error.message,
            message: 'Lỗi trong quá trình xác thực KYC'
        };
    }
};

const calculateOverallConfidence = (ocrResult, faceCompareResult, cardLivenessResult, faceLivenessResult) => {
    let totalWeight = 0;
    let weightedScore = 0;

    if (ocrResult && ocrResult.success) {
        const ocrConfidence = ocrResult.confidence || 0.8;
        weightedScore += ocrConfidence * 0.4;
        totalWeight += 0.4;
    }

    if (cardLivenessResult && cardLivenessResult.success) {
        const livenessScore = cardLivenessResult.is_real ? 1.0 : 0.0;
        weightedScore += livenessScore * 0.2;
        totalWeight += 0.2;
    }

    if (faceLivenessResult && faceLivenessResult.success) {
        const faceScore = faceLivenessResult.is_live ? 1.0 : 0.0;
        weightedScore += faceScore * 0.2;
        totalWeight += 0.2;
    }

    if (faceCompareResult && faceCompareResult.success) {
        weightedScore += faceCompareResult.similarity * 0.2;
        totalWeight += 0.2;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
};

export const classifyCardType = async (cardImageHash) => {
    try {
        console.log('🔵 [VNPT eKYC] Kiểm tra loại giấy tờ...');
        
        if (!VNPT_EKYC_TOKEN_ID || !VNPT_EKYC_TOKEN_KEY || !VNPT_ACCESS_TOKEN) {
            throw new Error('Chưa cấu hình thông tin xác thực VNPT eKYC');
        }

        const clientSession = generateClientSession();
        const token = `classify_${Date.now()}`;

        const requestBody = {
            img_card: cardImageHash,
            client_session: clientSession,
            token: token
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${VNPT_ACCESS_TOKEN}`,
            'Token-id': VNPT_EKYC_TOKEN_ID,
            'Token-key': VNPT_EKYC_TOKEN_KEY,
            'mac-address': 'MACHA_SERVER'
        };

        console.log('📨 [VNPT eKYC] Gửi yêu cầu phân loại...');
        
        const response = await axios.post(
            `${VNPT_EKYC_BASE_URL}/ai/v1/classify/id`,
            requestBody,
            {
                headers,
                timeout: 30000
            }
        );

        console.log('✅ [VNPT eKYC] Nhận được kết quả phân loại');
        
        const result = response.data;
        
        if (result.message !== 'IDG-00000000') {
            throw new Error(`Phân loại thất bại: ${result.message}`);
        }

        const object = result.object || {};
        
        const cardTypes = {
            0: 'CMT cũ - Mặt trước',
            1: 'CMT cũ - Mặt sau',
            2: 'CMND/CCCD mới - Mặt trước',
            3: 'CMND/CCCD mới - Mặt sau',
            4: 'Giấy tờ khác',
            5: 'Hộ chiếu'
        };

        console.log('🔍 [VNPT eKYC] Loại giấy tờ:', cardTypes[object.type] || 'Không xác định');

        return {
            success: true,
            message: result.message,
            type: object.type,
            type_name: cardTypes[object.type] || 'Không xác định',
            name: object.name
        };

    } catch (error) {
        console.error('❌ [VNPT eKYC] Lỗi phân loại:', error.message);
        console.error('❌ [VNPT eKYC] Response:', error.response?.data);
        
        return {
            success: false,
            error: error.message,
            message: error.response?.data?.message || error.message
        };
    }
};

