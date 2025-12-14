# ACCU Platform External Integration Guide

This guide details the configuration and usage of external integrations in the ACCU Platform, including the Clean Energy Regulator (CER) API, Email Services, and File Storage.

## 1. Overview

The platform uses a modular integration architecture:
- **CER Module**: Handles communication with the Clean Energy Regulator API.
- **Email Module**: Manages transactional emails via SMTP.
- **File Storage Module**: Supports local and S3-compatible (AWS S3, MinIO) storage.
- **External Module**: Provides a unified health check and management layer.

## 2. Configuration

All configurations are managed via environment variables.

### 2.1 CER API Integration
Configure connection to the CER portal.

| Variable | Description | Default |
|----------|-------------|---------|
| `CER_API_BASE_URL` | Base URL for CER API | `https://api.cleanenergyregulator.gov.au` |
| `CER_API_KEY` | API Key for authentication | (Required for live calls) |
| `CER_API_TIMEOUT` | Request timeout in ms | `30000` |

### 2.2 Email Service
SMTP configuration for sending emails.

| Variable | Description | Default |
|----------|-------------|---------|
| `EMAIL_HOST` | SMTP Hostname | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP Port | `587` |
| `EMAIL_USER` | SMTP Username | - |
| `EMAIL_PASSWORD` | SMTP Password | - |
| `EMAIL_SECURE` | Use SSL/TLS | `false` |
| `EMAIL_FROM` | Sender address | `noreply@accu-platform.com` |

### 2.3 File Storage
Supports `local` or `s3` providers.

| Variable | Description | Default |
|----------|-------------|---------|
| `FILE_STORAGE_PROVIDER` | `local` or `s3` | `local` |
| `FILE_STORAGE_BUCKET` | S3 Bucket Name | `accu-platform` |
| `FILE_STORAGE_REGION` | AWS Region | `us-east-1` |
| `FILE_STORAGE_ENDPOINT` | Custom Endpoint (e.g. MinIO) | - |
| `FILE_STORAGE_ACCESS_KEY_ID` | AWS Access Key | - |
| `FILE_STORAGE_SECRET_ACCESS_KEY` | AWS Secret Key | - |

## 3. Usage

### 3.1 Health Checks
The `ExternalModule` exposes a unified health check endpoint.

- **Endpoint**: `GET /api/integrations/health`
- **Roles**: `admin`
- **Response**:
```json
{
  "overallStatus": "UP",
  "services": [
    {
      "service": "CER API",
      "status": "UP",
      "latency": 120,
      "message": "Connected"
    },
    ...
  ]
}
```

### 3.2 CER Submission
Submit ACCU applications programmatically.

- **Endpoint**: `POST /api/integrations/cer/submit`
- **Body**: `SubmitCerApplicationDto`
- **Permissions**: `admin`, `auditor`

### 3.3 File Uploads
The file storage service automatically uses the configured provider.
- If `local`, files are stored in `apps/backend/uploads`.
- If `s3`, files are uploaded to the specified bucket and presigned URLs are generated for access.

## 4. Development & Testing

### Mock Mode
- **CER**: If `CER_API_KEY` is missing, the service runs in "Mock Mode", returning simulated success responses for testing.
- **Email**: If SMTP config is missing, emails are logged to the console instead of sent.
- **Storage**: `local` provider is default for easy development.

### Troubleshooting
- Check application logs for `[CerService]`, `[EmailService]`, or `[S3StorageProvider]` errors.
- Ensure correct IAM permissions for S3 access.
- Verify outbound network access for SMTP and external APIs.
