const THUMB_MAX_SIZE = 200;

export async function generateImageThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(THUMB_MAX_SIZE / img.width, THUMB_MAX_SIZE / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to generate thumbnail'));
          },
          'image/jpeg',
          0.7,
        );
      } catch (err) {
        reject(err);
      }
    };
    img.src = URL.createObjectURL(file);
  });
}

export async function generateVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.currentTime = 1; // Seek to 1 second

    const onSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(
          THUMB_MAX_SIZE / video.videoWidth,
          THUMB_MAX_SIZE / video.videoHeight,
          1,
        );
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(video.src);
            if (blob) resolve(blob);
            else reject(new Error('Failed to generate video thumbnail'));
          },
          'image/jpeg',
          0.7,
        );
      } catch (err) {
        reject(err);
      }
    };

    video.addEventListener('seeked', onSeeked);
    video.load();
  });
}
