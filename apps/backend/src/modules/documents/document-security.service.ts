import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';

export interface SecurityScanResult {
  isSafe: boolean;
  threats: string[];
  warnings: string[];
  metadata: {
    hasExecutableCode: boolean;
    hasMacros: boolean;
    hasEmbeddedFiles: boolean;
    fileType: string;
    suspiciousPatterns: string[];
  };
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedContent?: Buffer;
  extractedText?: string;
  metadata: {
    mimeType: string;
    fileExtension: string;
    isPasswordProtected: boolean;
    hasMetadata: boolean;
  };
}

@Injectable()
export class DocumentSecurityService {
  private readonly dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.ps1', '.sh', '.py', '.php', '.pl', '.rb', '.asp', '.aspx', '.jsp',
  ];

  private readonly suspiciousExtensions = [
    '.docm', '.xlsm', '.pptm', '.zip', '.rar', '.7z', '.tar', '.gz',
  ];

  private readonly allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
  ];

  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly maxContentLength = 10 * 1024 * 1024; // 10MB for content scanning

  /**
   * Comprehensive file security scan
   */
  async scanFile(file: Express.Multer.File): Promise<SecurityScanResult> {
    const result: SecurityScanResult = {
      isSafe: true,
      threats: [],
      warnings: [],
      metadata: {
        hasExecutableCode: false,
        hasMacros: false,
        hasEmbeddedFiles: false,
        fileType: file.mimetype,
        suspiciousPatterns: [],
      },
    };

    // Basic file validation
    const basicValidation = await this.performBasicValidation(file);
    if (!basicValidation.isValid) {
      result.isSafe = false;
      result.threats.push(...basicValidation.errors);
    }
    result.warnings.push(...basicValidation.warnings);

    // Check for dangerous extensions
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (this.dangerousExtensions.includes(fileExtension)) {
      result.isSafe = false;
      result.threats.push(`Dangerous file extension detected: ${fileExtension}`);
    }

    if (this.suspiciousExtensions.includes(fileExtension)) {
      result.warnings.push(`Potentially risky file extension: ${fileExtension}`);
    }

    // Check file content for malicious patterns
    const contentScan = await this.scanContent(file.buffer);
    result.metadata.hasExecutableCode = contentScan.hasExecutableCode;
    result.metadata.hasMacros = contentScan.hasMacros;
    result.metadata.hasEmbeddedFiles = contentScan.hasEmbeddedFiles;
    result.metadata.suspiciousPatterns = contentScan.suspiciousPatterns;

    if (contentScan.threats.length > 0) {
      result.isSafe = false;
      result.threats.push(...contentScan.threats);
    }

    // Check for hidden executables (files that claim to be one type but are actually another)
    const typeValidation = await this.validateFileType(file.buffer, file.mimetype, fileExtension);
    if (!typeValidation.isValid) {
      result.isSafe = false;
      result.threats.push('File type mismatch detected - potential security threat');
    }

    return result;
  }

  /**
   * Extract and validate document content
   */
  async extractAndValidateContent(file: Express.Multer.File): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        mimeType: file.mimetype,
        fileExtension: path.extname(file.originalname).toLowerCase(),
        isPasswordProtected: false,
        hasMetadata: false,
      },
    };

    try {
      // Check if file size exceeds scanning limit
      if (file.size > this.maxContentLength) {
        result.warnings.push('File too large for full content scanning');
        return result;
      }

      switch (file.mimetype) {
        case 'application/pdf':
          await this.validatePdf(file.buffer, result);
          break;
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          await this.validateOfficeDocument(file.buffer, result, file.mimetype);
          break;
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          await this.validateOfficeDocument(file.buffer, result, file.mimetype);
          break;
        case 'application/vnd.ms-powerpoint':
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          await this.validateOfficeDocument(file.buffer, result, file.mimetype);
          break;
        case 'text/plain':
        case 'text/csv':
          await this.validateTextFile(file.buffer, result);
          break;
        default:
          result.warnings.push(`Content validation not supported for ${file.mimetype}`);
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Content validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Calculate file hash for integrity checking
   */
  calculateFileHash(buffer: Buffer): {
    md5: string;
    sha1: string;
    sha256: string;
  } {
    return {
      md5: crypto.createHash('md5').update(buffer).digest('hex'),
      sha1: crypto.createHash('sha1').update(buffer).digest('hex'),
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    };
  }

  /**
   * Detect file encryption or corruption
   */
  async detectFileCorruption(file: Express.Multer.File): Promise<{
    isCorrupted: boolean;
    isEncrypted: boolean;
    confidence: number;
  }> {
    const buffer = file.buffer.slice(0, Math.min(file.size, 1024)); // Read first 1KB

    // Check for PDF encryption
    if (file.mimetype === 'application/pdf') {
      const header = buffer.toString('ascii', 0, 8);
      if (header.includes('/Encrypt')) {
        return { isCorrupted: false, isEncrypted: true, confidence: 0.9 };
      }
    }

    // Check for Office document encryption
    if (file.mimetype.includes('officedocument')) {
      try {
        // Office documents start with PK (ZIP format)
        if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
          // Check for encryption indicator in core properties
          const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 512));
          if (content.includes('encryption')) {
            return { isCorrupted: false, isEncrypted: true, confidence: 0.7 };
          }
        }
      } catch (error) {
        // Continue with other checks
      }
    }

    // Basic corruption detection - check for null bytes and invalid characters
    let nullCount = 0;
    let invalidCharCount = 0;

    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0) nullCount++;
      if (buffer[i] > 127 && !this.isValidExtendedAscii(buffer[i])) {
        invalidCharCount++;
      }
    }

    const corruptionScore = (nullCount + invalidCharCount) / buffer.length;

    return {
      isCorrupted: corruptionScore > 0.1, // More than 10% corrupted characters
      isEncrypted: false,
      confidence: Math.min(corruptionScore * 10, 1),
    };
  }

  /**
   * Validate file metadata for security
   */
  async validateMetadata(file: Express.Multer.File): Promise<{
    isValid: boolean;
    warnings: string[];
    sanitized: boolean;
  }> {
    const result = {
      isValid: true,
      warnings: [] as string[],
      sanitized: false,
    };

    // Check for suspicious metadata patterns
    const metadataPatterns = [
      /javascript:/i,
      /vbscript:/i,
      /data:/i,
      /file:/i,
      /\\.*\\.*\\.*/,
      /\.\./,
    ];

    const suspiciousMetadata = [
      'author',
      'subject',
      'keywords',
      'comments',
      'title',
    ];

    // Note: This is a simplified check. In a real implementation, you'd extract
    // actual file metadata using libraries like exiftool or file-specific parsers

    // Check filename for suspicious patterns
    if (metadataPatterns.some(pattern => pattern.test(file.originalname))) {
      result.warnings.push('Suspicious patterns detected in filename');
      result.sanitized = true;
    }

    return result;
  }

  /**
   * Perform basic file validation
   */
  private async performBasicValidation(file: Express.Multer.File): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // Check file size
    if (file.size > this.maxFileSize) {
      result.errors.push(`File size ${file.size} exceeds maximum allowed size ${this.maxFileSize}`);
      result.isValid = false;
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      result.errors.push(`MIME type ${file.mimetype} is not allowed`);
      result.isValid = false;
    }

    // Check for empty files
    if (file.size === 0) {
      result.errors.push('File is empty');
      result.isValid = false;
    }

    // Check for suspiciously small files
    if (file.size < 10) {
      result.warnings.push('File is unusually small');
    }

    return result;
  }

  /**
   * Scan file content for malicious patterns
   */
  private async scanContent(buffer: Buffer): Promise<{
    hasExecutableCode: boolean;
    hasMacros: boolean;
    hasEmbeddedFiles: boolean;
    suspiciousPatterns: string[];
    threats: string[];
  }> {
    const result = {
      hasExecutableCode: false,
      hasMacros: false,
      hasEmbeddedFiles: false,
      suspiciousPatterns: [] as string[],
      threats: [] as string[],
    };

    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));

    // Check for executable code patterns
    const executablePatterns = [
      /function\s+\w+\s*\(/i,
      /class\s+\w+/i,
      /import\s+.*from/i,
      /require\s*\(/i,
      /eval\s*\(/i,
      /exec\s*\(/i,
      /system\s*\(/i,
      /shell_exec\s*\(/i,
      /passthru\s*\(/i,
    ];

    // Check for macro patterns
    const macroPatterns = [
      /Auto(Open|Close)/i,
      /Sub\s+\w+/i,
      /Function\s+\w+/i,
      /VBA/i,
      / macros? /i,
    ];

    // Check for embedded file patterns
    const embeddedPatterns = [
      /PK\u0003\u0004/, // ZIP entries (Office documents)
      /%\!PS-Adobe/i, // PostScript
      /MZ/, // PE executables
      /\x7fELF/, // ELF executables
    ];

    // Check for suspicious patterns
    executablePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        result.hasExecutableCode = true;
        result.suspiciousPatterns.push('Potential executable code detected');
      }
    });

    macroPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        result.hasMacros = true;
        result.suspiciousPatterns.push('Potential macros detected');
      }
    });

    embeddedPatterns.forEach(pattern => {
      if (pattern.test(buffer.toString('binary'))) {
        result.hasEmbeddedFiles = true;
        result.suspiciousPatterns.push('Embedded files detected');
      }
    });

    return result;
  }

  /**
   * Validate file type by checking content signatures
   */
  private async validateFileType(buffer: Buffer, mimeType: string, fileExtension: string): Promise<{
    isValid: boolean;
  }> {
    // Magic number checks for common file types
    const signatures: { [key: string]: { bytes: Buffer; offset: number }[] } = {
      'application/pdf': [{ bytes: Buffer.from('25504446', 'hex'), offset: 0 }], // %PDF
      'image/jpeg': [{ bytes: Buffer.from('ffd8ff', 'hex'), offset: 0 }],
      'image/png': [{ bytes: Buffer.from('89504e47', 'hex'), offset: 0 }],
      'image/gif': [{ bytes: Buffer.from('47494638', 'hex'), offset: 0 }],
    };

    const fileSignatures = signatures[mimeType];
    if (fileSignatures) {
      for (const signature of fileSignatures) {
        const actualBytes = buffer.slice(signature.offset, signature.offset + signature.bytes.length);
        if (!actualBytes.equals(signature.bytes)) {
          return { isValid: false };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Validate PDF files
   */
  private async validatePdf(buffer: Buffer, result: FileValidationResult): Promise<void> {
    try {
      const data = await pdfParse(buffer);
      
      // Check for password protection
      if (data.info && (data.info.Encrypted || data.info['Encrypted'])) {
        result.metadata.isPasswordProtected = true;
        result.errors.push('PDF is password protected');
        result.isValid = false;
      }

      // Extract text for content validation
      if (data.text) {
        result.extractedText = data.text;
        await this.validateTextContent(data.text, result);
      }

      result.metadata.hasMetadata = Object.keys(data.info || {}).length > 0;
    } catch (error) {
      result.isValid = false;
      result.errors.push('Invalid PDF format');
    }
  }

  /**
   * Validate Office documents
   */
  private async validateOfficeDocument(buffer: Buffer, result: FileValidationResult, mimeType: string): Promise<void> {
    try {
      // Check if it's a valid Office document (ZIP format)
      if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
        // Check for password protection
        const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000));
        if (content.includes('encryption')) {
          result.metadata.isPasswordProtected = true;
          result.errors.push('Office document is password protected');
          result.isValid = false;
        }

        // Extract text content for Office documents
        if (mimeType.includes('wordprocessing')) {
          const text = await this.extractWordText(buffer);
          if (text) {
            result.extractedText = text;
            await this.validateTextContent(text, result);
          }
        }

        result.metadata.hasMetadata = true;
      } else {
        result.isValid = false;
        result.errors.push('Invalid Office document format');
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push('Failed to process Office document');
    }
  }

  /**
   * Validate text files
   */
  private async validateTextFile(buffer: Buffer, result: FileValidationResult): Promise<void> {
    try {
      const content = buffer.toString('utf-8');
      result.extractedText = content;
      await this.validateTextContent(content, result);
      result.metadata.hasMetadata = false;
    } catch (error) {
      result.isValid = false;
      result.errors.push('Invalid text file format');
    }
  }

  /**
   * Validate text content for security issues
   */
  private async validateTextContent(content: string, result: FileValidationResult): Promise<void> {
    const dangerousPatterns = [
      /<script[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:/gi,
      /file:/gi,
      /\\.*\\.*\\.*/g,
      /\.\./,
      /eval\s*\(/gi,
      /exec\s*\(/gi,
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        result.isValid = false;
        result.errors.push(`Dangerous pattern detected: ${pattern.source}`);
      }
    });

    // Check for potentially malicious URLs
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = content.match(urlPattern);
    if (urls) {
      urls.forEach(url => {
        if (this.isSuspiciousUrl(url)) {
          result.warnings.push(`Potentially suspicious URL detected: ${url}`);
        }
      });
    }
  }

  /**
   * Extract text from Word documents
   */
  private async extractWordText(buffer: Buffer): Promise<string | null> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.warn('Failed to extract text from Word document:', error);
      return null;
    }
  }

  /**
   * Check if URL is suspicious
   */
  private isSuspiciousUrl(url: string): boolean {
    const suspiciousPatterns = [
      /bit\.ly/i,
      /tinyurl/i,
      /t\.co/i,
      /localhost/i,
      /127\.0\.0\.1/i,
      /0\.0\.0\.0/i,
      /10\./i,
      /192\.168\./i,
      /172\.(1[6-9]|2[0-9]|3[0-1])\./i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if character is valid extended ASCII
   */
  private isValidExtendedAscii(byte: number): boolean {
    // Allow common extended ASCII characters
    return (
      (byte >= 0x20 && byte <= 0x7E) || // Printable ASCII
      (byte >= 0x80 && byte <= 0xFF) || // Extended ASCII
      byte === 0x09 || // Tab
      byte === 0x0A || // Line feed
      byte === 0x0D // Carriage return
    );
  }
}