#!/bin/bash

# Backup and Disaster Recovery Script
set -e

# Configuration
NAMESPACE=${NAMESPACE:-"accu-platform"}
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
RETENTION_DAYS=${RETENTION_DAYS:-30}
S3_BUCKET=${S3_BUCKET:-"accu-platform-backups"}
ENCRYPTION_ENABLED=${ENCRYPTION_ENABLED:-true}
COMPRESSION_ENABLED=${COMPRESSION_ENABLED:-true}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to create backup directory structure
setup_backup_environment() {
    print_header "Setting up Backup Environment"
    
    mkdir -p "$BACKUP_DIR"/{database,configs,storage,logs}
    chmod 700 "$BACKUP_DIR"
    
    # Set timestamps
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_DATE=$(date +%Y%m%d)
    
    print_status "Backup directory: $BACKUP_DIR"
    print_status "Backup timestamp: $BACKUP_TIMESTAMP"
}

# Function to backup database
backup_database() {
    print_header "Database Backup"
    
    DATABASE_BACKUP_FILE="$BACKUP_DIR/database/accu_platform_${BACKUP_TIMESTAMP}.sql"
    
    # Get database credentials from Kubernetes secret
    DB_HOST=$(kubectl get secret database-secret -n $NAMESPACE -o jsonpath='{.data.url}' | base64 -d | cut -d'@' -f2 | cut -d':' -f1)
    DB_USER=$(kubectl get secret database-secret -n $NAMESPACE -o jsonpath='{.data.username}' | base64 -d)
    DB_NAME=$(kubectl get secret database-secret -n $NAMESPACE -o jsonpath='{.data.url}' | base64 -d | cut -d'/' -f4 | cut -d'?' -f1)
    
    print_status "Backing up database: $DB_NAME"
    
    # Create database backup
    kubectl exec -n $NAMESPACE deployment/backend -- pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "$DATABASE_BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        print_status "✅ Database backup completed: $DATABASE_BACKUP_FILE"
        
        # Compress backup if enabled
        if [ "$COMPRESSION_ENABLED" = "true" ]; then
            gzip "$DATABASE_BACKUP_FILE"
            print_status "✅ Database backup compressed"
        fi
        
        # Encrypt backup if enabled
        if [ "$ENCRYPTION_ENABLED" = "true" ]; then
            BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-$(openssl rand -base64 32)}
            echo "$BACKUP_ENCRYPTION_KEY" > "$BACKUP_DIR/encryption_key_${BACKUP_TIMESTAMP}.key"
            
            if [[ "$DATABASE_BACKUP_FILE" == *.gz ]]; then
                gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc --quiet --no-greeting --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" --output "${DATABASE_BACKUP_FILE}.gpg" "$DATABASE_BACKUP_FILE"
                rm "$DATABASE_BACKUP_FILE"
            else
                gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc --quiet --no-greeting --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" --output "${DATABASE_BACKUP_FILE}.gpg" "$DATABASE_BACKUP_FILE"
                rm "$DATABASE_BACKUP_FILE"
            fi
            print_status "✅ Database backup encrypted"
        fi
        
        return 0
    else
        print_error "❌ Database backup failed"
        return 1
    fi
}

# Function to backup configurations
backup_configurations() {
    print_header "Configuration Backup"
    
    CONFIG_BACKUP_FILE="$BACKUP_DIR/configs/k8s_configs_${BACKUP_TIMESTAMP}.yaml"
    
    print_status "Backing up Kubernetes configurations..."
    
    # Backup all Kubernetes resources
    kubectl get all,configmaps,secrets,pvc,pv -n $NAMESPACE -o yaml > "$CONFIG_BACKUP_FILE"
    
    # Backup specific deployments
    kubectl get deployment backend frontend -n $NAMESPACE -o yaml >> "$CONFIG_BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        print_status "✅ Configuration backup completed: $CONFIG_BACKUP_FILE"
        
        # Compress if enabled
        if [ "$COMPRESSION_ENABLED" = "true" ]; then
            gzip "$CONFIG_BACKUP_FILE"
            print_status "✅ Configuration backup compressed"
        fi
        
        # Encrypt if enabled
        if [ "$ENCRYPTION_ENABLED" = "true" ]; then
            BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-$(openssl rand -base64 32)}
            if [[ "$CONFIG_BACKUP_FILE" == *.gz ]]; then
                gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc --quiet --no-greeting --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" --output "${CONFIG_BACKUP_FILE}.gpg" "$CONFIG_BACKUP_FILE"
                rm "$CONFIG_BACKUP_FILE"
            else
                gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc --quiet --no-greeting --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" --output "${CONFIG_BACKUP_FILE}.gpg" "$CONFIG_BACKUP_FILE"
                rm "$CONFIG_BACKUP_FILE"
            fi
            print_status "✅ Configuration backup encrypted"
        fi
        
        return 0
    else
        print_error "❌ Configuration backup failed"
        return 1
    fi
}

# Function to backup storage/files
backup_storage() {
    print_header "Storage Backup"
    
    STORAGE_BACKUP_FILE="$BACKUP_DIR/storage/file_storage_${BACKUP_TIMESTAMP}.tar.gz"
    
    print_status "Backing up file storage..."
    
    # Check if using AWS S3
    if command -v aws &> /dev/null; then
        # Backup S3 bucket
        aws s3 sync s3://$S3_BUCKET "$BACKUP_DIR/storage/s3_backup_"$BACKUP_TIMESTAMP"/" --exclude "*.tmp" --exclude "*.log"
        
        # Create archive
        tar -czf "$STORAGE_BACKUP_FILE" -C "$BACKUP_DIR/storage" "s3_backup_$BACKUP_TIMESTAMP"
        rm -rf "$BACKUP_DIR/storage/s3_backup_$BACKUP_TIMESTAMP"
        
        print_status "✅ S3 storage backup completed: $STORAGE_BACKUP_FILE"
    else
        # Backup local storage volumes
        kubectl exec -n $NAMESPACE deployment/backend -- tar -czf - /app/uploads > "$STORAGE_BACKUP_FILE"
        print_status "✅ Local storage backup completed: $STORAGE_BACKUP_FILE"
    fi
    
    # Encrypt if enabled
    if [ "$ENCRYPTION_ENABLED" = "true" ]; then
        BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY:-$(openssl rand -base64 32)}
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc --quiet --no-greeting --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" --output "${STORAGE_BACKUP_FILE}.gpg" "$STORAGE_BACKUP_FILE"
        rm "$STORAGE_BACKUP_FILE"
        print_status "✅ Storage backup encrypted"
    fi
}

# Function to backup logs
backup_logs() {
    print_header "Logs Backup"
    
    LOGS_BACKUP_FILE="$BACKUP_DIR/logs/application_logs_${BACKUP_TIMESTAMP}.tar.gz"
    
    print_status "Backing up application logs..."
    
    # Backup container logs
    kubectl logs -n $NAMESPACE -l app=backend --tail=1000 > "$BACKUP_DIR/logs/backend_logs_${BACKUP_TIMESTAMP}.log"
    kubectl logs -n $NAMESPACE -l app=frontend --tail=1000 > "$BACKUP_DIR/logs/frontend_logs_${BACKUP_TIMESTAMP}.log"
    
    # Backup system logs if available
    if kubectl get namespace logging &> /dev/null; then
        kubectl exec -n logging deployment/elasticsearch -- curl -s "http://localhost:9200/accu-platform-logs/_search?q=*&size=1000&sort=@timestamp:desc" > "$BACKUP_DIR/logs/elasticsearch_logs_${BACKUP_TIMESTAMP}.json"
    fi
    
    # Create archive
    tar -czf "$LOGS_BACKUP_FILE" -C "$BACKUP_DIR/logs" .
    rm -rf "$BACKUP_DIR/logs"/*
    
    print_status "✅ Logs backup completed: $LOGS_BACKUP_FILE"
}

# Function to upload backup to cloud storage
upload_backup() {
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        print_header "Uploading Backup to Cloud"
        
        BACKUP_ARCHIVE="$BACKUP_DIR/backup_${BACKUP_DATE}_${BACKUP_TIMESTAMP}.tar.gz"
        
        # Create full backup archive
        tar -czf "$BACKUP_ARCHIVE" -C "$BACKUP_DIR" database/ configs/ storage/ logs/
        
        # Upload to S3
        aws s3 cp "$BACKUP_ARCHIVE" "s3://$S3_BUCKET/backups/"
        
        if [ $? -eq 0 ]; then
            print_status "✅ Backup uploaded to S3: s3://$S3_BUCKET/backups/$BACKUP_ARCHIVE"
            
            # Generate backup manifest
            cat > "$BACKUP_DIR/backup_manifest_${BACKUP_TIMESTAMP}.json" << EOF
{
  "backup_timestamp": "$BACKUP_TIMESTAMP",
  "backup_date": "$BACKUP_DATE",
  "namespace": "$NAMESPACE",
  "backup_type": "full",
  "components": {
    "database": "accu_platform",
    "configurations": "k8s_resources",
    "storage": "file_storage",
    "logs": "application_logs"
  },
  "encryption": $ENCRYPTION_ENABLED,
  "compression": $COMPRESSION_ENABLED,
  "size_mb": $(du -m "$BACKUP_ARCHIVE" | cut -f1),
  "s3_location": "s3://$S3_BUCKET/backups/$BACKUP_ARCHIVE"
}
EOF
        else
            print_error "❌ Failed to upload backup to S3"
            return 1
        fi
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    print_header "Cleaning Old Backups"
    
    # Clean local backups older than retention period
    find "$BACKUP_DIR" -type f -name "*.sql*" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -type f -name "*.yaml*" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -type f -name "*.log*" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -type f -name "*.tar.gz*" -mtime +$RETENTION_DAYS -delete
    
    print_status "✅ Cleaned local backups older than $RETENTION_DAYS days"
    
    # Clean S3 backups if AWS CLI is available
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        aws s3 ls "s3://$S3_BUCKET/backups/" | awk '{print $4}' | while read file; do
            if [[ "$file" == *"$cutoff_date"* ]]; then
                aws s3 rm "s3://$S3_BUCKET/backups/$file"
                print_status "Deleted old S3 backup: $file"
            fi
        done
    fi
}

# Function to verify backup integrity
verify_backup() {
    print_header "Verifying Backup Integrity"
    
    # Check backup directory
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory not found"
        return 1
    fi
    
    # Check for backup files
    BACKUP_FILES=$(find "$BACKUP_DIR" -type f -name "*$BACKUP_TIMESTAMP*" 2>/dev/null | wc -l)
    if [ "$BACKUP_FILES" -eq 0 ]; then
        print_error "No backup files found for timestamp $BACKUP_TIMESTAMP"
        return 1
    fi
    
    # Test database backup integrity
    if [ -f "$BACKUP_DIR/database/accu_platform_${BACKUP_TIMESTAMP}.sql" ] || \
       [ -f "$BACKUP_DIR/database/accu_platform_${BACKUP_TIMESTAMP}.sql.gz" ] || \
       [ -f "$BACKUP_DIR/database/accu_platform_${BACKUP_TIMESTAMP}.sql.gpg" ]; then
        print_status "✅ Database backup found"
    else
        print_error "❌ Database backup not found"
        return 1
    fi
    
    # Test configuration backup integrity
    if [ -f "$BACKUP_DIR/configs/k8s_configs_${BACKUP_TIMESTAMP}.yaml" ] || \
       [ -f "$BACKUP_DIR/configs/k8s_configs_${BACKUP_TIMESTAMP}.yaml.gz" ] || \
       [ -f "$BACKUP_DIR/configs/k8s_configs_${BACKUP_TIMESTAMP}.yaml.gpg" ]; then
        print_status "✅ Configuration backup found"
    else
        print_error "❌ Configuration backup not found"
        return 1
    fi
    
    print_status "✅ Backup integrity verification passed"
    return 0
}

# Function to send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        if [ "$status" = "success" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"✅ Backup completed successfully: $message\"}" \
                $SLACK_WEBHOOK_URL
        else
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"❌ Backup failed: $message\"}" \
                $SLACK_WEBHOOK_URL
        fi
    fi
}

# Main backup function
main() {
    print_header "ACCU Platform Backup Process"
    
    # Create backup directory structure
    setup_backup_environment
    
    # Create backups
    if backup_database && \
       backup_configurations && \
       backup_storage && \
       backup_logs; then
        
        # Upload to cloud storage
        upload_backup
        
        # Verify backup integrity
        if verify_backup; then
            # Clean old backups
            cleanup_old_backups
            
            print_status "🎉 Backup process completed successfully!"
            send_notification "success" "All backup components completed"
            
            return 0
        else
            print_error "❌ Backup integrity verification failed"
            send_notification "failure" "Backup integrity verification failed"
            return 1
        fi
    else
        print_error "❌ Backup process failed"
        send_notification "failure" "Backup process failed"
        return 1
    fi
}

# Help function
show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help           Show this help message"
    echo "  -n, --namespace      Kubernetes namespace (default: accu-platform)"
    echo "  -d, --dir            Backup directory (default: ./backups)"
    echo "  -r, --retention      Backup retention in days (default: 30)"
    echo "  -b, --bucket         S3 bucket name"
    echo "  --no-encryption      Disable encryption"
    echo "  --no-compression     Disable compression"
    echo ""
    echo "Environment Variables:"
    echo "  NAMESPACE            Kubernetes namespace"
    echo "  BACKUP_DIR           Backup directory path"
    echo "  RETENTION_DAYS       Backup retention period"
    echo "  S3_BUCKET            AWS S3 bucket name"
    echo "  ENCRYPTION_ENABLED   Enable/disable encryption"
    echo "  COMPRESSION_ENABLED  Enable/disable compression"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -b|--bucket)
            S3_BUCKET="$2"
            shift 2
            ;;
        --no-encryption)
            ENCRYPTION_ENABLED="false"
            shift
            ;;
        --no-compression)
            COMPRESSION_ENABLED="false"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main