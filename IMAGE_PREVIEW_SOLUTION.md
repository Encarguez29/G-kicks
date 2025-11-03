# Image Preview Solution for Production

## Problem Summary
Image previews from file uploads were working in development but failing in production due to:
- Early revocation of Blob URLs
- CSP restrictions blocking blob URLs
- Next.js `<Image>` component limitations with blob URLs
- Missing proper cleanup of object URLs
- Production build optimizations affecting blob URL handling

## Solution Overview

### 1. **ImagePreview Component** (`components/image-preview.tsx`)
A reusable component that properly handles both blob URLs and uploaded URLs:

**Key Features:**
- ✅ Automatic blob URL cleanup with `useRef` and `useEffect`
- ✅ Fallback handling for failed image loads
- ✅ Smart component selection (regular `<img>` for blob URLs, Next.js `<Image>` for uploaded URLs)
- ✅ Error state management with placeholder UI
- ✅ Proper memory management to prevent leaks

**Usage:**
```tsx
<ImagePreview
  file={selectedFile}           // File object for blob preview
  uploadedUrl={uploadedUrl}     // Server URL after upload
  alt="Preview"
  width={300}
  height={200}
  onError={() => console.log('Image failed to load')}
/>
```

### 2. **useFileUpload Hook** (`hooks/use-file-upload.ts`)
A custom hook that manages the complete file upload lifecycle:

**Key Features:**
- ✅ File validation (type, size)
- ✅ Automatic blob URL creation and cleanup
- ✅ Upload progress tracking
- ✅ Error handling with user feedback
- ✅ Memory leak prevention

**Usage:**
```tsx
const {
  file,
  previewUrl,
  uploadedUrl,
  isUploading,
  error,
  handleFileSelect,
  handleUpload,
  clearFile,
  reset
} = useFileUpload({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  onUpload: async (file) => {
    // Your upload logic here
    return uploadedUrl;
  },
  onError: (error) => {
    // Handle errors
  }
});
```

### 3. **Next.js Configuration Updates** (`next.config.js`)
Added proper CSP headers to allow blob URLs in production:

```javascript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http: https:; font-src 'self' data:; connect-src 'self' http: https: ws: wss:; media-src 'self' blob: data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
}
```

**Key CSP Directives:**
- `img-src 'self' data: blob: http: https:` - Allows blob URLs for images
- `media-src 'self' blob: data:` - Allows blob URLs for media files

## Implementation in Cart Page

### Before (Problematic):
```tsx
const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null)
const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)

const handleScreenshotUpload = async (event) => {
  const file = event.target.files?.[0]
  // Manual validation and upload logic
  // No proper cleanup
  // Direct state management
}

// In JSX:
{screenshotPreview && (
  <img src={screenshotPreview} alt="Preview" />
)}
```

### After (Solution):
```tsx
const {
  file: screenshotFile,
  previewUrl: screenshotPreview,
  uploadedUrl: paymentScreenshot,
  isUploading: isUploadingScreenshot,
  error: screenshotError,
  handleFileSelect: handleScreenshotSelect,
  handleUpload: uploadScreenshot,
  reset: resetScreenshot
} = useFileUpload({
  maxSize: 10 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  onUpload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch('/api/upload-payment-screenshot', {
      method: 'POST',
      body: formData
    })
    const { url } = await response.json()
    return url
  }
})

// In JSX:
<ImagePreview
  file={screenshotFile}
  uploadedUrl={paymentScreenshot}
  alt="Payment screenshot preview"
  width={300}
  height={128}
/>
```

## Best Practices Implemented

### 1. **Blob URL Management**
- ✅ Create blob URLs only when needed
- ✅ Store blob URL references in `useRef` to prevent recreation on re-renders
- ✅ Clean up blob URLs in `useEffect` cleanup function
- ✅ Clean up on component unmount
- ✅ Clean up when new files are selected

### 2. **Component Selection Strategy**
- ✅ Use regular `<img>` tag for blob URLs (Next.js `<Image>` doesn't support blob URLs)
- ✅ Use Next.js `<Image>` component for uploaded URLs (optimization benefits)
- ✅ Add `unoptimized` prop for data URLs

### 3. **Error Handling**
- ✅ File type validation
- ✅ File size validation
- ✅ Upload error handling
- ✅ Image load error handling
- ✅ User-friendly error messages
- ✅ Graceful fallbacks

### 4. **Production Considerations**
- ✅ CSP headers configured for blob URLs
- ✅ Memory leak prevention
- ✅ Proper cleanup on navigation
- ✅ Error boundaries for failed uploads
- ✅ Loading states for better UX

## Testing Checklist

### Development Environment:
- [x] File selection creates blob URL preview
- [x] Upload functionality works
- [x] Preview switches from blob to uploaded URL
- [x] Error handling works for invalid files
- [x] Memory cleanup prevents leaks

### Production Environment:
- [x] Blob URLs work with CSP headers
- [x] Image previews display correctly
- [x] Upload functionality works
- [x] No console errors related to CSP
- [x] Memory usage remains stable

## Migration Guide

To apply this solution to other file upload components:

1. **Replace manual state management:**
   ```tsx
   // Remove these:
   const [file, setFile] = useState(null)
   const [preview, setPreview] = useState(null)
   
   // Replace with:
   const { file, previewUrl, uploadedUrl, handleFileSelect } = useFileUpload(options)
   ```

2. **Replace manual blob URL creation:**
   ```tsx
   // Remove this:
   const url = URL.createObjectURL(file)
   setPreview(url)
   
   // Hook handles this automatically
   ```

3. **Replace image display:**
   ```tsx
   // Replace this:
   <img src={preview} alt="Preview" />
   
   // With this:
   <ImagePreview file={file} uploadedUrl={uploadedUrl} alt="Preview" />
   ```

4. **Update file input handlers:**
   ```tsx
   // Replace this:
   onChange={handleManualUpload}
   
   // With this:
   onChange={handleFileSelect}
   ```

## Performance Benefits

- **Memory Usage:** Proper cleanup prevents memory leaks from accumulated blob URLs
- **Loading Speed:** Smart component selection optimizes image loading
- **User Experience:** Loading states and error handling improve perceived performance
- **Production Stability:** CSP compliance ensures consistent behavior across environments

## Security Considerations

- File type validation prevents malicious uploads
- File size limits prevent DoS attacks
- CSP headers maintain security while allowing necessary functionality
- Server-side validation should complement client-side checks

This solution provides a robust, production-ready image preview system that works consistently across all environments while maintaining security and performance standards.