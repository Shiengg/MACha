import { ocrCCCD } from './fpt-ai.service.js';

/**
 * Normalize Vietnamese name for comparison
 * Remove extra spaces, convert to uppercase, remove diacritics
 */
const normalizeName = (name) => {
    if (!name) return '';
    return name
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .normalize('NFD') // Decompose characters with diacritics
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
};

/**
 * Normalize ID number for comparison
 * Remove spaces, dashes, and other non-digit characters
 */
const normalizeIdNumber = (idNumber) => {
    if (!idNumber) return '';
    return String(idNumber).replace(/\D/g, ''); // Remove non-digit characters
};

/**
 * Compare two names with tolerance for minor differences
 */
const compareNames = (name1, name2) => {
    const normalized1 = normalizeName(name1);
    const normalized2 = normalizeName(name2);
    
    // Exact match
    if (normalized1 === normalized2) {
        return { match: true, confidence: 1.0, method: 'exact' };
    }
    
    // Check if one contains the other (for partial matches)
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
        const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
        const confidence = shorter.length / longer.length;
        
        // Consider match if confidence >= 0.8
        if (confidence >= 0.8) {
            return { match: true, confidence, method: 'partial' };
        }
    }
    
    // Calculate similarity using Levenshtein distance (simplified)
    const similarity = calculateSimilarity(normalized1, normalized2);
    
    // Consider match if similarity >= 0.85
    if (similarity >= 0.85) {
        return { match: true, confidence: similarity, method: 'similarity' };
    }
    
    return { match: false, confidence: similarity, method: 'similarity' };
};

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
};

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
};

/**
 * Compare ID numbers
 */
const compareIdNumbers = (id1, id2) => {
    const normalized1 = normalizeIdNumber(id1);
    const normalized2 = normalizeIdNumber(id2);
    
    // Exact match
    if (normalized1 === normalized2) {
        return { match: true, confidence: 1.0 };
    }
    
    // Check if last 4 or 6 digits match (for partial match cases)
    if (normalized1.length >= 4 && normalized2.length >= 4) {
        const last4_1 = normalized1.slice(-4);
        const last4_2 = normalized2.slice(-4);
        
        if (last4_1 === last4_2 && normalized1.length === normalized2.length) {
            // Same length and last 4 digits match, might be OCR error in first digits
            return { match: true, confidence: 0.9, note: 'Last 4 digits match' };
        }
    }
    
    return { match: false, confidence: 0 };
};

/**
 * Verify KYC by performing OCR on CCCD image and comparing with user input
 * @param {string} cccdImageUrl - URL of the CCCD front image
 * @param {Object} userInput - User input data
 * @param {string} userInput.identity_card_number - CCCD number from user
 * @param {string} userInput.identity_verified_name - Full name from user
 * @returns {Object} Verification result
 */
export const verifyKYCWithOCR = async (cccdImageUrl, userInput) => {
    try {
        if (!cccdImageUrl) {
            return {
                success: false,
                error: 'MISSING_CCCD_IMAGE',
                message: 'CCCD image URL is required'
            };
        }

        if (!userInput.identity_card_number || !userInput.identity_verified_name) {
            return {
                success: false,
                error: 'MISSING_USER_INPUT',
                message: 'Identity card number and name are required'
            };
        }

        console.log('🔵 [KYC Verification] Starting verification process...');
        console.log('📋 [KYC Verification] User input:');
        console.log('  - Identity Card Number:', userInput.identity_card_number);
        console.log('  - Name:', userInput.identity_verified_name);
        console.log('  - CCCD Image URL:', cccdImageUrl);

        // Perform OCR on CCCD image
        const ocrResult = await ocrCCCD(cccdImageUrl);

        console.log('📊 [KYC Verification] OCR Result:', ocrResult.success ? 'SUCCESS' : 'FAILED');

        if (!ocrResult.success) {
            console.error('❌ [KYC Verification] OCR failed:', ocrResult.error);
            return {
                success: false,
                error: 'OCR_FAILED',
                message: 'Failed to perform OCR on CCCD image',
                ocrError: ocrResult.error
            };
        }

        const extractedData = ocrResult.extracted_data;
        const extractedIdNumber = extractedData.identity_card_number;
        const extractedName = extractedData.identity_verified_name;

        console.log('🔍 [KYC Verification] Extracted from OCR:');
        console.log('  - Identity Card Number:', extractedIdNumber || 'NOT FOUND');
        console.log('  - Name:', extractedName || 'NOT FOUND');
        console.log('  - Full extracted data:', JSON.stringify(extractedData, null, 2));

        // Compare ID numbers
        console.log('🔢 [KYC Verification] Comparing ID numbers...');
        const idComparison = compareIdNumbers(
            userInput.identity_card_number,
            extractedIdNumber
        );
        console.log('  - User input:', userInput.identity_card_number);
        console.log('  - OCR extracted:', extractedIdNumber);
        console.log('  - Match:', idComparison.match);
        console.log('  - Confidence:', idComparison.confidence);

        // Compare names
        console.log('👤 [KYC Verification] Comparing names...');
        const nameComparison = compareNames(
            userInput.identity_verified_name,
            extractedName
        );
        console.log('  - User input:', userInput.identity_verified_name);
        console.log('  - OCR extracted:', extractedName);
        console.log('  - Match:', nameComparison.match);
        console.log('  - Confidence:', nameComparison.confidence);
        console.log('  - Method:', nameComparison.method);

        // Determine overall result
        const bothMatch = idComparison.match && nameComparison.match;
        const overallConfidence = (idComparison.confidence + nameComparison.confidence) / 2;

        console.log('✅ [KYC Verification] Final result:');
        console.log('  - Both match:', bothMatch);
        console.log('  - Overall confidence:', overallConfidence);

        // Build rejection reason if not matched
        let rejectionReason = null;
        if (!bothMatch) {
            const reasons = [];
            if (!idComparison.match) {
                reasons.push(`Số CCCD không khớp (Nhập: ${userInput.identity_card_number}, OCR: ${extractedIdNumber || 'Không nhận diện được'})`);
            }
            if (!nameComparison.match) {
                reasons.push(`Họ tên không khớp (Nhập: ${userInput.identity_verified_name}, OCR: ${extractedName || 'Không nhận diện được'})`);
            }
            rejectionReason = reasons.join('; ');
            console.log('❌ [KYC Verification] Rejection reason:', rejectionReason);
        } else {
            console.log('✅ [KYC Verification] Verification passed!');
        }

        return {
            success: true,
            match: bothMatch,
            confidence: overallConfidence,
            comparison: {
                id_number: {
                    user_input: userInput.identity_card_number,
                    ocr_extracted: extractedIdNumber,
                    ...idComparison
                },
                name: {
                    user_input: userInput.identity_verified_name,
                    ocr_extracted: extractedName,
                    ...nameComparison
                }
            },
            ocr_data: extractedData,
            rejection_reason: rejectionReason,
            should_approve: bothMatch // If match, status should be 'pending' for admin review
        };

    } catch (error) {
        console.error('KYC Verification Error:', error);
        return {
            success: false,
            error: 'VERIFICATION_ERROR',
            message: error.message || 'An error occurred during verification'
        };
    }
};

