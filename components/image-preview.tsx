'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface ImagePreviewProps {
  file: File | null;
  uploadedUrl?: string | null;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  onError?: () => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  file,
  uploadedUrl,
  alt = 'Preview',
  className = '',
  width = 300,
  height = 200,
  onError
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Clean up previous object URL
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    if (file) {
      // Create new object URL for file preview
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setPreviewUrl(url);
      setImageError(false);
    } else if (uploadedUrl) {
      // Use uploaded URL
      setPreviewUrl(uploadedUrl);
      setImageError(false);
    } else {
      setPreviewUrl(null);
      setImageError(false);
    }

    // Cleanup function
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file, uploadedUrl]);

  const handleImageError = () => {
    setImageError(true);
    onError?.();
  };

  if (!previewUrl || imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-2 text-sm">
            {imageError ? 'Failed to load image' : 'No image selected'}
          </p>
        </div>
      </div>
    );
  }

  // For blob URLs, use regular img tag as Next.js Image doesn't support blob URLs
  if (previewUrl.startsWith('blob:')) {
    return (
      <div className={`relative overflow-hidden rounded-lg ${className}`}>
        <img
          src={previewUrl}
          alt={alt}
          width={width}
          height={height}
          className="object-cover"
          onError={handleImageError}
          style={{ width, height }}
        />
      </div>
    );
  }

  // For uploaded URLs, use Next.js Image component for optimization
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <Image
        src={previewUrl}
        alt={alt}
        width={width}
        height={height}
        className="object-cover"
        onError={handleImageError}
        unoptimized={previewUrl.startsWith('data:')}
      />
    </div>
  );
};

export default ImagePreview;