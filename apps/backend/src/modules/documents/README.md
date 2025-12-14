# Documents Module Implementation

## Overview

The Documents module provides a complete document management system for the ACCU Platform with upload, metadata management, versioning, security scanning, and access control.

## Features

### Core Functionality
- **File Upload**: Multi-format file upload with validation
- **Metadata Management**: Rich metadata including tags, categories, descriptions
- **Versioning System**: Document version tracking and rollback capability
- **Search & Filtering**: Advanced search by content, tags, metadata
- **Access Control**: Role-based permissions and security
- **Security Scanning**: Comprehensive file security validation

### Supported File Types
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Images**: JPEG, PNG, GIF, WEBP
- **Text**: TXT, CSV, JSON, XML
- **Archives**: ZIP, RAR (with security warnings)

### Security Features
- **File Type Validation**: MIME type and extension verification
- **Content Scanning**: Malicious pattern detection
- **Encryption Detection**: Password-protected file identification
- **File Integrity**: SHA-256 checksums for verification
- **Virus Scanning**: Basic threat detection (extendable)

## Architecture

### Service Layer

#### DocumentsService
- **uploadDocument()**: Upload new documents with security scanning
- **findAll()**: Paginated document listing with filtering
- **update()**: Update document metadata
- **uploadVersion()**: Create new document versions
- **download()**: Secure file download
- **bulkOperation()**: Batch document operations
- **searchByTags()**: Tag-based document search

#### FileStorageService
- **uploadFile()**: Secure file storage with validation
- **getFileBuffer()**: Retrieve file content
- **deleteFile()**: Remove files from storage
- **getStorageQuota()**: Storage usage tracking

#### DocumentSecurityService
- **scanFile()**: Comprehensive security scanning
- **extractAndValidateContent()**: Content extraction and validation
- **calculateFileHash()**: Multiple hash algorithms
- **detectFileCorruption()**: File integrity checking

### Controller Endpoints

#### Document Management
```
POST   /documents/upload           # Upload new document
GET    /documents                  # List documents (paginated)
GET    /documents/:id              # Get document details
PUT    /documents/:id              # Update document metadata
DELETE /documents/:id              # Soft delete document
```

#### Version Management
```
POST   /documents/:id/versions     # Upload new version
GET    /documents/:id/versions     # Get document versions
```

#### File Operations
```
GET    /documents/:id/download     # Download document
GET    /documents/:id/audit        # Get audit trail
```

#### Search & Analytics
```
GET    /documents/search/tags      # Search by tags
GET    /documents/stats            # Get document statistics
```

#### Bulk Operations
```
POST   /documents/bulk             # Bulk operations
```

### Data Models

#### Document Entity
```typescript
{
  id: string;
  name: string;
  description?: string;
  category: DocumentCategory;
  status: DocumentStatus;
  version: number;
  fileName: string;
  originalFileName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
  metadata: Record<string, any>;
  tags: string[];
  uploadedById: string;
  projectId?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Document Upload DTO
```typescript
{
  file: Express.Multer.File;
  name?: string;
  description?: string;
  category: DocumentCategory;
  tags?: string[];
  projectId?: string;
  metadata?: Record<string, any>;
  status?: DocumentStatus;
}
```

## Security Implementation

### File Validation Pipeline
1. **Basic Validation**: File size, MIME type, extension checking
2. **Security Scanning**: Pattern detection, threat identification
3. **Content Analysis**: Text extraction, malicious content check
4. **Integrity Verification**: Hash calculation, corruption detection
5. **Metadata Security**: Sanitization of metadata fields

### Security Scan Results
```typescript
{
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
```

### File Type Restrictions
- **Blocked Extensions**: .exe, .bat, .cmd, .com, .pif, .scr, .vbs, .js, etc.
- **Restricted Extensions**: .docm, .xlsm, .pptm, .zip, .rar (require warnings)
- **Allowed Types**: PDF, Office documents, images, text files

## Integration Points

### Dependencies
- **FileStorageModule**: File storage operations
- **TypeORM**: Database operations
- **Multer**: File upload handling
- **Passport/JWT**: Authentication

### Environment Variables
```bash
FILE_UPLOAD_DIR=./uploads
FILE_BASE_URL=http://localhost:3000/files
MAX_FILE_SIZE=52428800  # 50MB
STORAGE_QUOTA=1073741824  # 1GB
```

## API Examples

### Upload Document
```bash
curl -X POST /documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "name=Quarterly Report" \
  -F "category=audit_report" \
  -F "tags=quarterly,audit,compliance"
```

### Search Documents
```bash
curl -X GET "/documents?search=audit&category=audit_report&status=approved" \
  -H "Authorization: Bearer <token>"
```

### Download Document
```bash
curl -X GET "/documents/:id/download" \
  -H "Authorization: Bearer <token>" \
  --output downloaded_file.pdf
```

### Upload New Version
```bash
curl -X POST "/documents/:id/versions" \
  -H "Authorization: Bearer <token>" \
  -F "file=@updated_document.pdf" \
  -F "versionNotes=Updated compliance section"
```

## Permissions

### Required Permissions
- **DOCUMENTS_READ**: View documents
- **DOCUMENTS_WRITE**: Upload/update documents
- **DOCUMENTS_DELETE**: Delete documents

### Role Requirements
- **Admin/Super Admin**: Full access
- **Manager**: Read/write access
- **User**: Basic read/write access
- **Viewer**: Read-only access

## Error Handling

### Common Error Responses
- **400**: Invalid file or data
- **413**: File too large
- **415**: Unsupported file type
- **422**: Security scan failure
- **404**: Document not found
- **403**: Insufficient permissions

### Security Error Examples
```json
{
  "statusCode": 422,
  "message": "Security scan failed: Malicious content detected",
  "error": "Unprocessable Entity"
}
```

## Performance Considerations

### File Size Limits
- **Upload Limit**: 50MB per file
- **Storage Quota**: 1GB per tenant (configurable)
- **Concurrent Uploads**: Limited by server resources

### Caching Strategy
- **Document Metadata**: Cached in application layer
- **File Content**: Not cached for security reasons
- **Search Results**: Short-term caching for performance

## Monitoring & Logging

### Security Events
- Failed security scans
- Malware detection
- File corruption detection
- Suspicious file uploads

### Audit Trail
- Document creation/modification
- File downloads
- Version uploads
- Access patterns

## Testing

### Unit Tests
- Service layer testing
- Security service validation
- DTO validation

### Integration Tests
- End-to-end upload flow
- Security scanning pipeline
- Permission enforcement

### Test Files
- `test/documents.test.ts`: Unit tests
- Manual testing with various file types
- Security scenario testing

## Future Enhancements

### Planned Features
- **OCR Integration**: Text extraction from images
- **Virus Scanner**: Integration with ClamAV or similar
- **Cloud Storage**: AWS S3, Google Cloud Storage support
- **Advanced Search**: Full-text search with Elasticsearch
- **Collaboration**: Document sharing and comments
- **Workflow**: Document approval workflows
- **Retention Policies**: Automated document archival

### Security Improvements
- **Real-time Scanning**: On-access virus scanning
- **Sandboxing**: Isolated file processing
- **Behavioral Analysis**: ML-based threat detection
- **Blockchain Verification**: Immutable audit trails

## Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- File system with adequate space
- Sufficient memory for file processing

### Configuration
1. Set environment variables
2. Configure file storage directory
3. Set up database migrations
4. Configure security policies

### Health Checks
- File system accessibility
- Database connectivity
- Storage quota monitoring
- Security service availability

## Support

For issues and questions:
- Check the API documentation
- Review security scan logs
- Verify file permissions
- Monitor storage quotas