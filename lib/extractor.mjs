/**
 * Text extraction utilities for raw files.
 * 
 * Supports:
 * - .txt, .md: Plain text reading
 * - .pptx: Slide text extraction using pizzip + xml2js
 * - .pdf: Placeholder (no OCR in v0)
 */

import { readFileSync, statSync } from 'fs';
import { extname } from 'path';
import PizZip from 'pizzip';
import { parseStringPromise } from 'xml2js';

/**
 * Extract text from a file based on its extension.
 * @param {string} filePath - Path to the file
 * @returns {Promise<{text: string, isPlaceholder: boolean}>}
 */
export async function extractText(filePath) {
  const ext = extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.txt':
    case '.md':
      return extractPlainText(filePath);
    case '.pptx':
      return extractPptx(filePath);
    case '.pdf':
      return extractPdf(filePath);
    default:
      return {
        text: `[Unsupported file type: ${ext}]`,
        isPlaceholder: true
      };
  }
}

/**
 * Extract plain text from .txt or .md files.
 * @param {string} filePath - Path to the file
 * @returns {{text: string, isPlaceholder: boolean}}
 */
export function extractPlainText(filePath) {
  try {
    const text = readFileSync(filePath, 'utf-8');
    return { text, isPlaceholder: false };
  } catch (err) {
    return {
      text: `[Error reading file: ${err.message}]`,
      isPlaceholder: true
    };
  }
}

/**
 * Extract text from PowerPoint (.pptx) files.
 * PPTX files are ZIP archives containing XML files.
 * We extract text from slide XML files.
 * 
 * @param {string} filePath - Path to the .pptx file
 * @returns {Promise<{text: string, isPlaceholder: boolean}>}
 */
export async function extractPptx(filePath) {
  try {
    const data = readFileSync(filePath);
    const zip = new PizZip(data);
    
    const slideTexts = [];
    let slideIndex = 1;
    
    // PPTX stores slides in ppt/slides/slide1.xml, slide2.xml, etc.
    while (true) {
      const slidePath = `ppt/slides/slide${slideIndex}.xml`;
      const slideFile = zip.file(slidePath);
      
      if (!slideFile) break;
      
      const slideXml = slideFile.asText();
      const slideText = await extractTextFromSlideXml(slideXml);
      
      if (slideText.trim()) {
        slideTexts.push(`--- Slide ${slideIndex} ---\n${slideText}`);
      }
      
      slideIndex++;
    }
    
    if (slideTexts.length === 0) {
      return {
        text: '[No text content found in slides]',
        isPlaceholder: true
      };
    }
    
    return {
      text: slideTexts.join('\n\n'),
      isPlaceholder: false
    };
  } catch (err) {
    return {
      text: `[Error extracting PPTX: ${err.message}]\n\nPlease paste the slide content here manually.`,
      isPlaceholder: true
    };
  }
}

/**
 * Extract text content from a slide XML string.
 * @param {string} xml - Slide XML content
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromSlideXml(xml) {
  try {
    const result = await parseStringPromise(xml, { 
      explicitArray: false,
      ignoreAttrs: true 
    });
    
    const texts = [];
    extractNestedText(result, texts);
    
    return texts.join('\n');
  } catch {
    return '';
  }
}

/**
 * Recursively extract text from parsed XML object.
 * Looks for 'a:t' elements which contain text in OOXML format.
 * @param {any} obj - Parsed XML object
 * @param {string[]} texts - Array to collect text strings
 */
function extractNestedText(obj, texts) {
  if (!obj || typeof obj !== 'object') return;
  
  // 'a:t' is the text element in OOXML (PowerPoint XML)
  if (obj['a:t']) {
    const text = typeof obj['a:t'] === 'string' ? obj['a:t'] : obj['a:t'].toString();
    if (text.trim()) {
      texts.push(text.trim());
    }
  }
  
  // Recurse into arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractNestedText(item, texts);
    }
  } else {
    // Recurse into object properties
    for (const key of Object.keys(obj)) {
      extractNestedText(obj[key], texts);
    }
  }
}

/**
 * Handle PDF files - placeholder in v0 (no OCR).
 * @param {string} filePath - Path to the .pdf file
 * @returns {{text: string, isPlaceholder: boolean}}
 */
export function extractPdf(filePath) {
  const stats = statSync(filePath);
  return {
    text: `[PDF extraction not enabled in v0]

This PDF file is ${formatBytes(stats.size)}. 

To include this content:
1. Open the PDF in a viewer
2. Select all text (Cmd+A / Ctrl+A)
3. Copy and paste the text below this line

---
PASTE PDF TEXT HERE
---`,
    isPlaceholder: true
  };
}

/**
 * Get file metadata.
 * @param {string} filePath - Path to the file
 * @returns {{ext: string, bytes: number}}
 */
export function getFileMetadata(filePath) {
  const ext = extname(filePath).toLowerCase().slice(1); // Remove leading dot
  const stats = statSync(filePath);
  return {
    ext,
    bytes: stats.size
  };
}

/**
 * Format bytes to human-readable string.
 * @param {number} bytes 
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Supported file extensions for conversion.
 */
export const SUPPORTED_EXTENSIONS = ['.pdf', '.pptx', '.txt', '.md'];
