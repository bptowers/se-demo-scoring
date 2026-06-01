import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { SupportedFileType } from '../types';

// Configure PDF.js worker - use local worker from node_modules
// Vite will handle bundling this properly
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const FILE_UPLOAD_CONFIG = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_SIZE_MB: 10,
  SUPPORTED_EXTENSIONS: ['.txt', '.md', '.pdf', '.docx'],
};

/**
 * Validates if a file is within the allowed size limit
 */
export const validateFileSize = (file: File): boolean => {
  return file.size <= FILE_UPLOAD_CONFIG.MAX_SIZE_BYTES;
};

/**
 * Converts bytes to a human-readable file size format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Determines the file type based on file extension
 */
export const getFileType = (file: File): SupportedFileType => {
  const extension = file.name.toLowerCase().split('.').pop();

  switch (extension) {
    case 'txt':
    case 'md':
      return 'txt';
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    default:
      return 'unsupported';
  }
};

/**
 * Processes a text file and returns its content
 */
export const processTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
};

/**
 * Processes a PDF file and extracts text from all pages
 */
export const processPdfFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  } catch (error: any) {
    // Provide more specific error messages for common PDF issues
    if (error.message?.includes('password')) {
      throw new Error('PDF is password-protected');
    }
    if (error.message?.includes('Invalid PDF')) {
      throw new Error('PDF file is corrupted or invalid');
    }
    throw new Error(`Failed to process PDF: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Processes a DOCX file and extracts plain text
 */
export const processDocxFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error: any) {
    throw new Error(`Failed to process DOCX: ${error.message || 'Unknown error'}`);
  }
};
