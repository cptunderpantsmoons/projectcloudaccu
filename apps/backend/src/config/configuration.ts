export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  environment: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'accu_platform',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // File storage configuration
  fileStorage: {
    provider: process.env.FILE_STORAGE_PROVIDER || 'local', // local, s3, minio
    bucket: process.env.FILE_STORAGE_BUCKET || 'accu-platform',
    endpoint: process.env.FILE_STORAGE_ENDPOINT || 'http://localhost:9000',
    accessKeyId: process.env.FILE_STORAGE_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.FILE_STORAGE_SECRET_ACCESS_KEY || 'minioadmin',
    region: process.env.FILE_STORAGE_REGION || 'us-east-1',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 50 * 1024 * 1024, // 50MB
  },

  // Email configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@accu-platform.com',
  },

  // External API configuration
  cer: {
    baseUrl: process.env.CER_API_BASE_URL || 'https://api.cleanenergyregulator.gov.au',
    apiKey: process.env.CER_API_KEY || '',
    timeout: parseInt(process.env.CER_API_TIMEOUT, 10) || 30000,
  },

  // Rate limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // 100 requests per minute
  },

  // CORS
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },

  // Feature flags
  features: {
    enableWorkflowEngine: process.env.ENABLE_WORKFLOW_ENGINE === 'true',
    enableRealTimeNotifications: process.env.ENABLE_REAL_TIME_NOTIFICATIONS !== 'false',
    enableCerApiIntegration: process.env.ENABLE_CER_API_INTEGRATION === 'true',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
  },

  // Temporal configuration
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'accu-workflows',
    maxConcurrentWorkflowPollers: parseInt(process.env.TEMPORAL_MAX_CONCURRENT_WORKFLOW_POLLERS, 10) || 2,
    maxConcurrentActivityPollers: parseInt(process.env.TEMPORAL_MAX_CONCURRENT_ACTIVITY_POLLERS, 10) || 2,
    maxConcurrentWorkflowExecutions: parseInt(process.env.TEMPORAL_MAX_CONCURRENT_WORKFLOW_EXECUTIONS, 10) || 100,
    maxConcurrentActivityExecutions: parseInt(process.env.TEMPORAL_MAX_CONCURRENT_ACTIVITY_EXECUTIONS, 10) || 100,
    tls: {
      enabled: process.env.TEMPORAL_TLS_ENABLED === 'true',
      serverNameOverride: process.env.TEMPORAL_TLS_SERVER_NAME,
      rootCA: process.env.TEMPORAL_TLS_ROOT_CA,
      clientCert: process.env.TEMPORAL_TLS_CLIENT_CERT,
      clientKey: process.env.TEMPORAL_TLS_CLIENT_KEY,
    },
  },
});