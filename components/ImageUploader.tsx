'use client';

import { useState, useRef } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  maxSizeMB?: number;
  aspectRatio?: 'square' | 'banner' | 'free';
  uploadPath?: string;
}

export default function ImageUploader({
  value,
  onChange,
  maxSizeMB = 5,
  aspectRatio = 'free',
  uploadPath = 'images'
}: ImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string>(value);

  const validateFile = (file: File): boolean => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPG, PNG, or WebP image',
        variant: 'destructive'
      });
      return false;
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `Please upload an image smaller than ${maxSizeMB}MB`,
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      const user = await getCurrentUser();
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `${timestamp}.${extension}`;
      const path = `public/providers/${user.userId}/${uploadPath}/${fileName}`;

      const result = await uploadData({
        path,
        data: file,
        options: {
          contentType: file.type,
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              const progress = Math.round((transferredBytes / totalBytes) * 100);
              setUploadProgress(progress);
            }
          }
        }
      }).result;

      // Generate public URL
      const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${path}`;
      
      onChange(url);
      toast({
        title: 'Upload successful',
        description: 'Your image has been uploaded'
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Please try again',
        variant: 'destructive'
      });
      setPreview('');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'banner':
        return 'aspect-[4/1]';
      default:
        return 'aspect-video';
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed border-gray-300 rounded-lg
            ${getAspectRatioClass()}
            flex flex-col items-center justify-center
            cursor-pointer hover:border-primary transition-colors
            bg-gray-50 hover:bg-gray-100
          `}
        >
          <Upload className="h-10 w-10 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700">
            Click to upload image
          </p>
          <p className="text-xs text-gray-500 mt-1">
            JPG, PNG or WebP (max {maxSizeMB}MB)
          </p>
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className={`w-full object-cover rounded-lg ${getAspectRatioClass()}`}
          />
          {!isUploading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />

      {/* Upload Button (Mobile-friendly) */}
      {!preview && !isUploading && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Choose from Gallery
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // Note: Camera capture would need additional implementation
              fileInputRef.current?.click();
            }}
            className="flex-1"
          >
            <Camera className="mr-2 h-4 w-4" />
            Take Photo
          </Button>
        </div>
      )}
    </div>
  );
}