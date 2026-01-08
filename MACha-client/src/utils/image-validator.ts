export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export const imageValidator = {
  validateImageFile(file: File): ImageValidationResult {
    const warnings: string[] = [];

    if (!file.type.startsWith('image/')) {
      return {
        isValid: false,
        error: 'File phải là định dạng ảnh (JPG, JPEG, PNG)'
      };
    }

    const validFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validFormats.includes(file.type)) {
      return {
        isValid: false,
        error: 'Chỉ chấp nhận định dạng JPG, JPEG hoặc PNG'
      };
    }

    if (file.size > 5 * 1024 * 1024) {
      return {
        isValid: false,
        error: 'Kích thước ảnh không được vượt quá 5MB'
      };
    }

    if (file.size < 50 * 1024) {
      warnings.push('Ảnh có kích thước nhỏ, có thể ảnh hưởng đến chất lượng OCR');
    }

    return {
      isValid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  },

  async validateImageDimensions(file: File): Promise<ImageValidationResult> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const width = img.width;
        const height = img.height;
        const warnings: string[] = [];

        const minWidth = 600;
        const minHeight = 900;
        const recommendedWidth = 1200;
        const recommendedHeight = 1800;

        if (width < minWidth || height < minHeight) {
          resolve({
            isValid: false,
            error: `Độ phân giải tối thiểu là ${minWidth}x${minHeight} pixel. Ảnh của bạn: ${width}x${height}`
          });
          return;
        }

        if (width < recommendedWidth || height < recommendedHeight) {
          warnings.push(
            `Độ phân giải khuyến nghị là ${recommendedWidth}x${recommendedHeight} pixel để đạt kết quả tốt nhất. Ảnh của bạn: ${width}x${height}`
          );
        }

        const aspectRatio = width / height;
        if (aspectRatio < 0.5 || aspectRatio > 2) {
          warnings.push('Tỷ lệ ảnh không chuẩn, có thể ảnh hưởng đến kết quả OCR');
        }

        resolve({
          isValid: true,
          warnings: warnings.length > 0 ? warnings : undefined
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          isValid: false,
          error: 'Không thể đọc được ảnh. Vui lòng chọn file ảnh hợp lệ'
        });
      };

      img.src = url;
    });
  },

  async validateCardImage(file: File): Promise<ImageValidationResult> {
    const fileValidation = this.validateImageFile(file);
    if (!fileValidation.isValid) {
      return fileValidation;
    }

    const dimensionValidation = await this.validateImageDimensions(file);
    if (!dimensionValidation.isValid) {
      return dimensionValidation;
    }

    return {
      isValid: true,
      warnings: [
        ...(fileValidation.warnings || []),
        ...(dimensionValidation.warnings || [])
      ]
    };
  },

  async validateSelfieImage(file: File): Promise<ImageValidationResult> {
    const fileValidation = this.validateImageFile(file);
    if (!fileValidation.isValid) {
      return fileValidation;
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const width = img.width;
        const height = img.height;
        const warnings: string[] = [...(fileValidation.warnings || [])];

        const minDimension = 480;
        const recommendedWidth = 720;
        const recommendedHeight = 1280;

        if (width < minDimension || height < minDimension) {
          resolve({
            isValid: false,
            error: `Độ phân giải ảnh chân dung tối thiểu là ${minDimension}x${minDimension} pixel`
          });
          return;
        }

        if (width < recommendedWidth || height < recommendedHeight) {
          warnings.push(
            `Khuyến nghị độ phân giải ${recommendedWidth}x${recommendedHeight} pixel để đạt kết quả tốt nhất`
          );
        }

        resolve({
          isValid: true,
          warnings: warnings.length > 0 ? warnings : undefined
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          isValid: false,
          error: 'Không thể đọc được ảnh. Vui lòng chọn file ảnh hợp lệ'
        });
      };

      img.src = url;
    });
  }
};

