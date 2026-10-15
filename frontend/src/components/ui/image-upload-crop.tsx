
import React, { useState, useRef, useCallback } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Upload, RotateCw, Check, X } from 'lucide-react';

const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

interface ImageUploadCropProps {
  onImageSave: (imageFile: File, croppedImageUrl: string) => void;
  currentImage?: string;
  maxSizeBytes?: number;
  /** When set, accept any input size and compress the cropped output to fit within this many bytes. */
  maxOutputSizeBytes?: number;
}

export const ImageUploadCrop: React.FC<ImageUploadCropProps> = ({
  onImageSave,
  currentImage,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  maxOutputSizeBytes,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [sizeError, setSizeError] = useState<string>('');
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Only enforce input size limit when maxOutputSizeBytes is NOT set
    if (!maxOutputSizeBytes && file.size > maxSizeBytes) {
      const kb = maxSizeBytes / 1024;
      const label = kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(0)} MB`;
      setSizeError(`File size must be under ${label}.`);
      event.target.value = '';
      return;
    }

    setSizeError('');

    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setIsDialogOpen(true);
      setCropPosition({ x: 0, y: 0 });
      setScale(1);
      setRotation(0);
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const generateCroppedImage = useCallback(async (): Promise<{ dataUrl: string; file: File }> => {
    if (!selectedFile || !canvasRef.current) return { dataUrl: '', file: selectedFile! };

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { dataUrl: '', file: selectedFile };

    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = 200;
        canvas.height = 200;

        ctx.save();
        ctx.translate(100, 100);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        ctx.translate(cropPosition.x, cropPosition.y);

        const size = Math.min(img.width, img.height);
        const sourceX = (img.width - size) / 2;
        const sourceY = (img.height - size) / 2;

        ctx.drawImage(img, sourceX, sourceY, size, size, -100, -100, 200, 200);
        ctx.restore();

        let dataUrl: string;

        if (maxOutputSizeBytes) {
          // Compress by reducing JPEG quality until output fits within target
          let quality = 0.92;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          while (quality > 0.05) {
            // base64 byte estimate: (length - prefix) * 0.75
            const prefix = 'data:image/jpeg;base64,'.length;
            const approxBytes = (dataUrl.length - prefix) * 0.75;
            if (approxBytes <= maxOutputSizeBytes) break;
            quality = Math.round((quality - 0.05) * 100) / 100;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } else {
          dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        }

        // Convert data URL → File
        const byteStr = atob(dataUrl.split(',')[1]);
        const arr = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
        const blob = new Blob([arr], { type: 'image/jpeg' });
        const outFile = new File([blob], selectedFile!.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });

        resolve({ dataUrl, file: outFile });
      };
      img.src = imageUrl;
    });
  }, [selectedFile, imageUrl, cropPosition, scale, rotation, maxOutputSizeBytes]);

  const handleSave = async () => {
    if (!selectedFile) return;

    const { dataUrl, file } = await generateCroppedImage();
    onImageSave(file, dataUrl);
    setIsDialogOpen(false);
    setImageUrl('');
    setSelectedFile(null);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setImageUrl('');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-start gap-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload New Picture
        </Button>
        {sizeError && (
          <p className="text-sm text-red-500">{sizeError}</p>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop & Position Image</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {imageUrl && (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div
                    className="w-48 h-48 border-2 border-primary rounded-full overflow-hidden bg-gray-100 relative"
                    style={{
                      backgroundImage: `url(${imageUrl})`,
                      backgroundSize: `${scale * 100}%`,
                      backgroundPosition: `${50 + cropPosition.x}% ${50 + cropPosition.y}%`,
                      backgroundRepeat: 'no-repeat',
                      transform: `rotate(${rotation}deg)`
                    }}
                  >
                    <div
                      className="absolute inset-0 cursor-move"
                      onMouseDown={(e) => {
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startPos = { ...cropPosition };

                        const handleMouseMove = (e: MouseEvent) => {
                          const deltaX = (e.clientX - startX) * 0.5;
                          const deltaY = (e.clientY - startY) * 0.5;
                          setCropPosition({
                            x: Math.max(-50, Math.min(50, startPos.x + deltaX)),
                            y: Math.max(-50, Math.min(50, startPos.y + deltaY))
                          });
                        };

                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };

                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 w-full">
                  <label className="text-sm font-medium">Zoom</label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  Rotate
                </Button>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Check className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
};
