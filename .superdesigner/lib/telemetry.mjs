/**
 * Anonymous telemetry for Superdesigner CLI.
 * Collects command usage counts only - no PII, file paths, or content.
 * 
 * Opt-out:
 *   - Set SUPERDESIGNER_TELEMETRY=0
 *   - Pass --no-telemetry flag
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir, platform } from 'os';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Default telemetry endpoint (Edge Function URL).
 * Can be overridden via SUPERDESIGNER_TELEMETRY_URL env var.
 */
const DEFAULT_TELEMETRY_URL = 'https://oyqzggnlrmkfthudsjrt.supabase.co/functions/v1/superdesigner-ingest';

/**
 * Timeout for telemetry requests in milliseconds.
 */
const TELEMETRY_TIMEOUT_MS = 2000;

/**
 * Get the config directory path based on platform.
 * @returns {string} - Config directory path
 */
function getConfigDir() {
  const home = homedir();
  
  if (platform() === 'win32') {
    // Windows: %APPDATA%/superdesigner
    return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'superdesigner');
  }
  
  // macOS/Linux: ~/.config/superdesigner
  return join(home, '.config', 'superdesigner');
}

/**
 * Get the telemetry config file path.
 * @returns {string} - Path to telemetry.json
 */
function getTelemetryConfigPath() {
  return join(getConfigDir(), 'telemetry.json');
}

/**
 * Read the telemetry config file.
 * @returns {object} - Config object with anon_id and nudges
 */
function readConfig() {
  try {
    const configPath = getTelemetryConfigPath();
    if (existsSync(configPath)) {
      const content = readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch {
    // Ignore read errors
  }
  return {};
}

/**
 * Write the telemetry config file.
 * @param {object} config - Config object to write
 */
function writeConfig(config) {
  try {
    const configPath = getTelemetryConfigPath();
    const configDir = dirname(configPath);
    
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // Ignore write errors - telemetry is best-effort
  }
}

/**
 * Check if telemetry is enabled.
 * @param {{ args?: string[] }} options - Options object with optional args array
 * @returns {boolean} - True if telemetry is enabled
 */
export function isTelemetryEnabled({ args = [] } = {}) {
  // Check environment variable
  const envValue = process.env.SUPERDESIGNER_TELEMETRY;
  if (envValue === '0' || envValue === 'false') {
    return false;
  }
  
  // Check --no-telemetry flag in args
  if (args.includes('--no-telemetry')) {
    return false;
  }
  
  return true;
}

/**
 * Get or create the anonymous user ID.
 * Stored locally, never sent with identifying info.
 * @returns {string} - UUID for this user
 */
export function getAnonId() {
  const config = readConfig();
  
  if (config.anon_id) {
    return config.anon_id;
  }
  
  // Generate new anonymous ID
  const anonId = randomUUID();
  writeConfig({
    ...config,
    anon_id: anonId,
    nudges: config.nudges || {}
  });
  
  return anonId;
}

/**
 * Track an event (best-effort, never throws).
 * @param {string} event - Event name (cmd_init, cmd_review, cmd_review_agent)
 * @param {object} props - Event properties (version, node, platform)
 * @param {{ args?: string[] }} options - Options with args for opt-out check
 * @returns {Promise<void>}
 */
export async function track(event, props = {}, { args = [] } = {}) {
  try {
    // Skip if telemetry is disabled
    if (!isTelemetryEnabled({ args })) {
      return;
    }
    
    const anonId = getAnonId();
    const telemetryUrl = process.env.SUPERDESIGNER_TELEMETRY_URL || DEFAULT_TELEMETRY_URL;
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);
    
    try {
      await fetch(telemetryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anon_id: anonId,
          event,
          props
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    // Silently ignore all errors - telemetry must never break CLI
  }
}

/**
 * Get common event properties (version, node version, platform).
 * @param {string} version - Package version
 * @returns {object} - Common props
 */
export function getCommonProps(version) {
  return {
    version,
    node: process.version,
    platform: platform()
  };
}
