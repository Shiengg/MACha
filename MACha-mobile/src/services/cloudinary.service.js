const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

export const cloudinaryService = {
  /**
   * Upload a single image to Cloudinary
   * @param {string} imageUri - Local URI of the image (from ImagePicker)
   * @param {string} folder - Cloudinary folder name (default: 'campaigns')
   * @returns {Promise<{secure_url: string, public_id: string, format: string, width: number, height: number}>}
   */
  async uploadImage(imageUri, folder = 'campaigns') {
    if (!CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary cloud name is not configured');
    }

    // Extract filename from URI
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: type,
      name: filename,
    });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let fetch set it with boundary
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Cloudinary upload failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(
        `Failed to upload image to Cloudinary: ${errorData.error?.message || response.statusText}`
      );
    }

    const result = await response.json();
    console.log('✅ Upload successful:', result.secure_url);
    return result;
  },

  /**
   * Upload multiple images to Cloudinary
   * @param {string[]} imageUris - Array of local URIs
   * @param {string} folder - Cloudinary folder name (default: 'campaigns')
   * @returns {Promise<Array<{secure_url: string, public_id: string, format: string, width: number, height: number}>>}
   */
  async uploadMultipleImages(imageUris, folder = 'campaigns') {
    const uploadPromises = imageUris.map(uri => this.uploadImage(uri, folder));
    return await Promise.all(uploadPromises);
  },

  /**
   * Get optimized URL for a Cloudinary image
   * @param {string} publicId - Cloudinary public_id
   * @param {number} width - Optional width
   * @param {number} height - Optional height
   * @returns {string}
   */
  getOptimizedUrl(publicId, width, height) {
    if (!CLOUDINARY_CLOUD_NAME) return '';
    
    let transformations = 'f_auto,q_auto';
    if (width) transformations += `,w_${width}`;
    if (height) transformations += `,h_${height}`;
    
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
  },
};

