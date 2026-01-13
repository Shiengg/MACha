/**
 * Generic similarity scoring utility
 * Used for fuzzy search across different entities (campaigns, users, posts, etc.)
 * 
 * Scoring algorithm:
 * - Exact prefix match: +1000 points
 * - Contains search term: +500 points
 * - Exact word matches: +100 points per word
 * - Partial word matches: +10 points per match
 * - Optional bonus: configurable (e.g., active status, verified status)
 */

/**
 * Calculate relevance score for a text field against a search term
 * 
 * @param {string} text - The text to search in (e.g., title, username, fullname)
 * @param {string} searchTerm - The normalized search term (lowercase, trimmed)
 * @param {string[]} searchWords - Array of individual words from search term
 * @param {number} bonus - Optional bonus points (default: 0)
 * @returns {number} Relevance score
 */
export const calculateSimilarityScore = (text, searchTerm, searchWords, bonus = 0) => {
    if (!text || !searchTerm) {
        return 0;
    }

    const textLower = text.toLowerCase().trim();
    let score = 0;

    // Exact prefix match gets highest priority
    if (textLower.startsWith(searchTerm)) {
        score += 1000;
    }

    // Contains search term (but not at start)
    if (textLower.includes(searchTerm) && !textLower.startsWith(searchTerm)) {
        score += 500;
    }

    // Split text into words for word-level matching
    const textWords = textLower.split(/\s+/).filter(word => word.length > 0);
    const matchedWords = new Set();

    // Exact word matches
    searchWords.forEach(word => {
        if (textWords.includes(word)) {
            matchedWords.add(word);
        }
    });
    score += matchedWords.size * 100;

    // Partial word matches (fuzzy matching)
    searchWords.forEach(word => {
        if (!matchedWords.has(word)) {
            textWords.forEach(textWord => {
                if (textWord.includes(word) || word.includes(textWord)) {
                    score += 10;
                }
            });
        }
    });

    // Add optional bonus (e.g., active status, verified status)
    if (bonus > 0) {
        score += bonus;
    }

    return score;
};

/**
 * Normalize search term for consistent matching
 * - Converts to lowercase
 * - Trims whitespace
 * - Collapses multiple spaces
 * 
 * @param {string} searchTerm - Raw search term
 * @returns {string} Normalized search term
 */
export const normalizeSearchTerm = (searchTerm) => {
    if (!searchTerm) {
        return "";
    }
    return searchTerm.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Split search term into individual words
 * 
 * @param {string} searchTerm - Normalized search term
 * @returns {string[]} Array of words (filtered to remove empty strings)
 */
export const splitSearchWords = (searchTerm) => {
    if (!searchTerm) {
        return [];
    }
    return searchTerm.split(/\s+/).filter(word => word.length > 0);
};

