export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

export const cloudinaryService = {
  async uploadImage(file: File, folder: string = 'campaigns'): Promise<CloudinaryUploadResponse> {
    if (!CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary cloud name is not configured');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
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

  async uploadMultipleImages(files: File[], folder: string = 'campaigns'): Promise<CloudinaryUploadResponse[]> {
    const uploadPromises = files.map(file => this.uploadImage(file, folder));
    return await Promise.all(uploadPromises);
  },

  getOptimizedUrl(publicId: string, width?: number, height?: number): string {
    if (!CLOUDINARY_CLOUD_NAME) return '';
    
    let transformations = 'f_auto,q_auto';
    if (width) transformations += `,w_${width}`;
    if (height) transformations += `,h_${height}`;
    
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
  },
};

