/**
 * Environment Variable Validator
 * Validates required environment variables at server startup
 * Throws clear errors if validation fails
 */

/**
 * Required environment variables
 */
const REQUIRED_VARS = [
  {
    name: 'JWT_SECRET',
    description: 'Secret key for JWT token signing',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return 'JWT_SECRET cannot be empty';
      }
      if (value.length < 16) {
        return 'JWT_SECRET must be at least 16 characters';
      }
      return null;
    }
  },
  {
    name: 'BACKEND_PORT',
    description: 'Port for the backend server',
    validate: (value) => {
      const port = parseInt(value);
      if (isNaN(port) || port < 1 || port > 65535) {
        return 'BACKEND_PORT must be a valid port number (1-65535)';
      }
      return null;
    },
    required: false // Optional - has default
  },
  {
    name: 'PRODUCTION_CLEAN_MODE',
    description: 'Disables aggressive background scanning and verbose logging',
    validate: (value) => {
      if (value && value !== 'true' && value !== 'false') {
        return 'PRODUCTION_CLEAN_MODE must be true or false';
      }
      return null;
    },
    required: false
  },
  {
    name: 'SMART_AI_MODE',
    description: 'AI processing mode: smart_ai_balanced_8gb, balanced, aggressive, calm',
    validate: (value) => {
      const validModes = ['smart_ai_balanced_8gb', 'balanced', 'aggressive', 'calm'];
      if (value && !validModes.includes(value)) {
        return `SMART_AI_MODE must be one of: ${validModes.join(', ')}`;
      }
      return null;
    },
    required: false
  }
];

/**
 * Check if production clean mode is enabled
 * @returns {boolean}
 */
const isProductionCleanMode = () => {
  return process.env.PRODUCTION_CLEAN_MODE === 'true';
};

/**
 * Validate all required environment variables
 * @throws {Error} If any validation fails
 */
const validateEnv = () => {
  const errors = [];
  
  for (const varConfig of REQUIRED_VARS) {
    const value = process.env[varConfig.name];
    
    // Check if required (not explicitly marked as optional)
    if (varConfig.required !== false && !value) {
      errors.push(`❌ ${varConfig.name}: ${varConfig.description} - NOT SET`);
      continue;
    }
    
    // Skip validation for optional vars that are not set
    if (!value && varConfig.required === false) {
      continue;
    }
    
    // Run custom validation
    if (varConfig.validate) {
      const validationError = varConfig.validate(value);
      if (validationError) {
        errors.push(`❌ ${varConfig.name}: ${validationError}`);
      }
    }
  }
  
  // Throw if any errors
  if (errors.length > 0) {
    const message = '\n--- Environment Validation Failed ---\n' + 
                   errors.join('\n') + 
                   '\n--- Please check your .env file ---\n';
    throw new Error(message);
  }
  
  console.log('✅ Environment validation passed');
};

/**
 * Check if a specific env var is set
 * @param {string} name - Variable name
 * @returns {boolean}
 */
const isSet = (name) => {
  return !!process.env[name];
};

/**
 * Get an env var with default
 * @param {string} name - Variable name
 * @param {*} defaultValue - Default value
 * @returns {*} Value or default
 */
const get = (name, defaultValue) => {
  return process.env[name] || defaultValue;
};

module.exports = {
  validateEnv,
  isSet,
  get
};
