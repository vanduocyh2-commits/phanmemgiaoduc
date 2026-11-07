/**
 * Standalone image rotation controls for an uploaded essay image.
 * The host application supplies the image and receives the rotated File
 * through onReplace. This module does not inspect app globals or selectors.
 */

export function mountEssayImageRotation({
  image,
  file,
  onReplace,
  step = 90,
  jpegQuality = 0.92,
} = {}) {
  if (!image || image.tagName !== 'IMG') {
    throw new TypeError('mountEssayImageRotation requires an IMG element');
  }
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    throw new TypeError('mountEssayImageRotation requires an image File');
  }
  if (typeof onReplace !== 'function') {
    throw new TypeError('mountEssayImageRotation requires an onReplace callback');
  }

  let rotation = 0;
  let currentFile = file;
  const controls = document.createElement('div');
  controls.className = 'essay-image-rotation';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Xoay ảnh bài làm');

  const left = document.createElement('button');
  left.type = 'button';
  left.textContent = '↶ Xoay trái 90°';
  left.className = 'essay-image-rotation__button';

  const right = document.createElement('button');
  right.type = 'button';
  right.textContent = '↷ Xoay phải 90°';
  right.className = 'essay-image-rotation__button';

  const status = document.createElement('span');
  status.className = 'essay-image-rotation__status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = 'Ảnh chưa xoay';

  const loadImage = (blob) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const source = new Image();
    source.onload = () => {
      URL.revokeObjectURL(url);
      resolve(source);
    };
    source.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh để xoay'));
    };
    source.src = url;
  });

  const rotate = async (direction) => {
    left.disabled = true;
    right.disabled = true;
    try {
      const source = await loadImage(currentFile);
      const normalizedStep = ((step % 360) + 360) % 360 || 90;
      rotation = (rotation + direction * normalizedStep + 360) % 360;
      const sideways = rotation % 180 !== 0;
      const canvas = document.createElement('canvas');
      canvas.width = sideways ? source.naturalHeight : source.naturalWidth;
      canvas.height = sideways ? source.naturalWidth : source.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh');
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.drawImage(source, -source.naturalWidth / 2, -source.naturalHeight / 2);

      const outputType = currentFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, outputType, jpegQuality)
      );
      if (!blob) throw new Error('Không thể tạo ảnh sau khi xoay');

      const nextFile = new File([blob], currentFile.name, {
        type: outputType,
        lastModified: Date.now(),
      });
      currentFile = nextFile;
      image.src = URL.createObjectURL(nextFile);
      image.style.transform = 'none';
      await onReplace(nextFile, { rotation });
      status.textContent = `Đã xoay ảnh ${rotation}° và cập nhật tệp`;
    } catch (error) {
      status.textContent = error?.message || 'Không thể xoay ảnh';
      throw error;
    } finally {
      left.disabled = false;
      right.disabled = false;
    }
  };

  const onLeft = () => rotate(-1).catch(() => {});
  const onRight = () => rotate(1).catch(() => {});
  left.addEventListener('click', onLeft);
  right.addEventListener('click', onRight);
  controls.append(left, right, status);
  image.insertAdjacentElement('afterend', controls);

  return () => {
    left.removeEventListener('click', onLeft);
    right.removeEventListener('click', onRight);
    controls.remove();
  };
}
