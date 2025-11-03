'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseFileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  onUpload?: (file: File) => Promise<string>;
  onError?: (error: string) => void;
}

interface UseFileUploadReturn {
  file: File | null;
  previewUrl: string | null;
  uploadedUrl: string | null;
  isUploading: boolean;
  error: string | null;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleUpload: () => Promise<void>;
  clearFile: () => void;
  reset: () => void;
}

export const useFileUpload = (options: UseFileUploadOptions = {}): UseFileUploadReturn => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    onUpload,
    onError
  } = options;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const objectUrlRef = useRef<string | null>(null);

  // Cleanup function for object URLs
  const cleanupObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }
    
    if (file.size > maxSize) {
      return `File size too large. Maximum size: ${(maxSize / 1024 / 1024).toFixed(1)}MB`;
    }
    
    return null;
  }, [allowedTypes, maxSize]);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    
    if (!selectedFile) {
      clearFile();
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    // Clean up previous object URL
    cleanupObjectUrl();
    
    // Create new object URL
    const url = URL.createObjectURL(selectedFile);
    objectUrlRef.current = url;
    
    setFile(selectedFile);
    setPreviewUrl(url);
    setUploadedUrl(null);
    setError(null);
  }, [validateFile, cleanupObjectUrl, onError]);

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (!file || !onUpload) return;

    setIsUploading(true);
    setError(null);

    try {
      const url = await onUpload(file);
      setUploadedUrl(url);
      
      // Clean up blob URL after successful upload
      cleanupObjectUrl();
      setPreviewUrl(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [file, onUpload, cleanupObjectUrl, onError]);

  // Clear current file
  const clearFile = useCallback(() => {
    cleanupObjectUrl();
    setFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setError(null);
  }, [cleanupObjectUrl]);

  // Reset all state
  const reset = useCallback(() => {
    cleanupObjectUrl();
    setFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setIsUploading(false);
    setError(null);
  }, [cleanupObjectUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupObjectUrl();
    };
  }, [cleanupObjectUrl]);

  return {
    file,
    previewUrl,
    uploadedUrl,
    isUploading,
    error,
    handleFileSelect,
    handleUpload,
    clearFile,
    reset
  };
};