/**
 * Storage Service (Cloudinary).
 * Upload de imágenes vía unsigned preset.
 *
 * Cambiar de proveedor (S3, Firebase Storage, etc.) =
 * solo modificar este archivo.
 */

import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

class StorageService {
  /**
   * Sube un File/Blob y devuelve { url, publicId }.
   */
  async upload(file, { folder = config.cloudinary.folder, onProgress } = {}) {
    if (!config.cloudinary.cloudName || config.cloudinary.cloudName.startsWith('TU_')) {
      throw new Error('Cloudinary no configurado en core/config.js');
    }

    const url = `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/auto/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', config.cloudinary.uploadPreset);
    formData.append('folder', folder);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);
          resolve({
            url: res.secure_url,
            publicId: res.public_id,
            width: res.width,
            height: res.height,
            format: res.format,
            bytes: res.bytes
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  }

  /**
   * Sube varios archivos en paralelo.
   */
  async uploadMany(files, opts = {}) {
    return Promise.all([...files].map((f) => this.upload(f, opts)));
  }

  /**
   * Genera URL transformada (resize, format, etc.) sin re-subir.
   */
  transform(url, transformations) {
    // Cloudinary syntax: ...upload/w_300,h_300,c_fill/...
    return url.replace('/upload/', `/upload/${transformations}/`);
  }

  thumbnail(url, size = 300) {
    return this.transform(url, `w_${size},h_${size},c_fill,q_auto,f_auto`);
  }
}

export const storage = new StorageService();
