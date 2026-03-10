/**
 * Input Validation Middleware - Production Grade
 * Uses Zod-like validation with detailed error messages
 */

const logger = require('../utils/logger');

// Validation schemas
const schemas = {
  // Video upload validation
  'video.upload': {
    title: { type: 'string', maxLength: 200, required: false },
    maxSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska']
  },

  // Job ID validation
  'job.id': {
    jobId: { type: 'string', pattern: /^[a-zA-Z0-9-_]+$/, required: true }
  },

  // AI predict validation
  'ai.predict': {
    videoId: { type: 'number', required: false },
    videoPath: { type: 'string', required: false },
    transcript: { type: 'string', maxLength: 50000, required: false }
  },

  // AI caption validation
  'ai.caption': {
    text: { type: 'string', maxLength: 5000, required: true }
  },

  // AI hashtags validation
  'ai.hashtags': {
    text: { type: 'string', maxLength: 5000, required: true },
    count: { type: 'number', min: 1, max: 30, required: false }
  },

  // AI analyze validation
  'ai.analyze': {
    transcript: { type: 'string', maxLength: 50000, required: true },
    title: { type: 'string', maxLength: 200, required: false },
    duration: { type: 'number', min: 1, max: 3600, required: false }
  },

  // Credit check validation
  'credits.check': {
    credits: { type: 'number', min: 1, max: 100, required: true },
    action: { type: 'string', maxLength: 100, required: false }
  },

  // Platform export validation
  'export.platform': {
    videoPath: { type: 'string', required: true },
    platform: { type: 'string', enum: ['tiktok', 'reels', 'youtube_shorts', 'youtube'], required: true }
  },

  // Trending suggestions validation
  'trending.suggestions': {
    category: { type: 'string', maxLength: 50, required: false },
    count: { type: 'number', min: 1, max: 20, required: false }
  }
};

/**
 * Validate a value against a field schema
 */
function validateField(value, fieldSchema) {
  const errors = [];

  // Check required
  if (fieldSchema.required && (value === undefined || value === null || value === '')) {
    errors.push('Field is required');
    return { valid: false, errors };
  }

  // Skip further validation if not required and empty
  if (!fieldSchema.required && (value === undefined || value === null || value === '')) {
    return { valid: true, errors: [] };
  }

  // Type validation
  if (fieldSchema.type) {
    if (fieldSchema.type === 'string' && typeof value !== 'string') {
      errors.push('Must be a string');
    } else if (fieldSchema.type === 'number' && typeof value !== 'number') {
      errors.push('Must be a number');
    }
  }

  // String validations
  if (typeof value === 'string') {
    if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
      errors.push(`Must be at most ${fieldSchema.maxLength} characters`);
    }
    if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
      errors.push(`Must be at least ${fieldSchema.minLength} characters`);
    }
    if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
      errors.push('Invalid format');
    }
    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      errors.push(`Must be one of: ${fieldSchema.enum.join(', ')}`);
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (fieldSchema.min !== undefined && value < fieldSchema.min) {
      errors.push(`Must be at least ${fieldSchema.min}`);
    }
    if (fieldSchema.max !== undefined && value > fieldSchema.max) {
      errors.push(`Must be at most ${fieldSchema.max}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate request body against schema
 */
function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      logger.warn({ message: 'Validation schema not found', schema: schemaName });
      return next(); // Skip validation if schema not found
    }

    const errors = [];
    const data = { ...req.body, ...req.query, ...req.params };

    // Validate each field in schema
    for (const [field, fieldSchema] of Object.entries(schema)) {
      if (typeof fieldSchema === 'object' && fieldSchema.type) {
        const result = validateField(data[field], fieldSchema);
        if (!result.valid) {
          errors.push({ field, messages: result.errors });
        }
      }
    }

    // Check for unknown fields (optional security measure)
    const allowedFields = Object.keys(schema).filter(k => typeof schemas[schemaName][k] === 'object');
    const unknownFields = Object.keys(data).filter(k => !allowedFields.includes(k));
    
    if (unknownFields.length > 0 && process.env.NODE_ENV === 'strict') {
      // In strict mode, reject unknown fields
      // For now, just log a warning
      logger.warn({ message: 'Unknown fields in request', fields: unknownFields, path: req.path });
    }

    if (errors.length > 0) {
      logger.warn({
        message: 'Validation failed',
        schema: schemaName,
        errors,
        path: req.path,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          validationErrors: errors
        }
      });
    }

    next();
  };
}

/**
 * Validate file upload
 */
function validateFile(fieldName = 'video') {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No file uploaded'
        }
      });
    }

    const file = req.file;
    const schema = schemas['video.upload'];

    // Validate file size
    if (schema.maxSize && file.size > schema.maxSize) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File too large. Maximum size is ${Math.round(schema.maxSize / 1024 / 1024)}MB`
        }
      });
    }

    // Validate MIME type
    if (schema.allowedTypes && !schema.allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: 'Unsupported file type'
        }
      });
    }

    // Check for double extension attacks
    const filename = file.originalname.toLowerCase();
    const dangerousExtensions = ['.exe', '.php', '.js', '.html', '.htm', '.phtml', '.asp', '.jsp'];
    const hasDoubleExtension = dangerousExtensions.some(ext => filename.includes(ext));
    
    if (hasDoubleExtension) {
      logger.warn({
        message: 'Potential double extension attack detected',
        filename: file.originalname,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: 'Invalid file name'
        }
      });
    }

    next();
  };
}

/**
 * Sanitize input - remove potentially dangerous characters
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Sanitize request body
 */
function sanitize() {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      for (const key of Object.keys(req.body)) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitizeInput(req.body[key]);
        }
      }
    }
    next();
  };
}

module.exports = {
  validate,
  validateFile,
  sanitize,
  schemas
};
