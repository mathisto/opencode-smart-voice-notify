import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

/**
 * Basic JSONC parser that strips single-line and multi-line comments.
 * @param {string} jsonc 
 * @returns {any}
 */
const parseJSONC = (jsonc) => {
  const stripped = jsonc.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
  return JSON.parse(stripped);
};

/**
 * Get the directory where this plugin is installed.
 * Used to find bundled assets like example.config.jsonc
 */
const getPluginDir = () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.dirname(__dirname); // Go up from util/ to plugin root
};

/**
 * Generate a minimal default configuration file content.
 * This provides a working config with helpful comments pointing to the full example.
 */
const generateDefaultConfig = () => {
  return `{
    // ============================================================
    // OpenCode Smart Voice Notify - Configuration
    // ============================================================
    // This file was auto-generated with minimal defaults.
    // For ALL available options, see the full example config:
    //   node_modules/opencode-smart-voice-notify/example.config.jsonc
    // Or visit: https://github.com/MasuRii/opencode-smart-voice-notify#configuration
    // ============================================================

    // NOTIFICATION MODE
    // 'sound-first' - Play sound immediately, TTS reminder after delay (RECOMMENDED)
    // 'tts-first'   - Speak TTS immediately, no sound
    // 'both'        - Play sound AND speak TTS immediately
    // 'sound-only'  - Only play sound, no TTS at all
    "notificationMode": "sound-first",

    // ============================================================
    // TTS ENGINE SELECTION
    // ============================================================
    // 'elevenlabs' - Best quality (requires API key, free tier: 10k chars/month)
    // 'edge'       - Good quality (free, requires: pip install edge-tts)
    // 'sapi'       - Windows built-in (free, offline, robotic)
    "ttsEngine": "edge",
    "enableTTS": true,

    // ============================================================
    // ELEVENLABS SETTINGS (Optional - for best quality)
    // ============================================================
    // Get your free API key from: https://elevenlabs.io/app/settings/api-keys
    // Uncomment and add your key to use ElevenLabs:
    // "elevenLabsApiKey": "YOUR_API_KEY_HERE",
    // "elevenLabsVoiceId": "cgSgspJ2msm6clMCkdW9",

    // ============================================================
    // EDGE TTS SETTINGS (Default - Free Neural Voices)
    // ============================================================
    // Requires: pip install edge-tts
    "edgeVoice": "en-US-AnaNeural",
    "edgePitch": "+50Hz",
    "edgeRate": "+10%",

    // ============================================================
    // TTS REMINDER SETTINGS
    // ============================================================
    "enableTTSReminder": true,
    "ttsReminderDelaySeconds": 30,
    "permissionReminderDelaySeconds": 20,
    "enableFollowUpReminders": true,
    "maxFollowUpReminders": 3,

    // ============================================================
    // SOUND FILES (Relative to ~/.config/opencode/)
    // ============================================================
    // NOTE: You need to copy the sound files to your config directory!
    // Copy from: node_modules/opencode-smart-voice-notify/assets/
    // To: ~/.config/opencode/assets/
    "idleSound": "assets/Soft-high-tech-notification-sound-effect.mp3",
    "permissionSound": "assets/Machine-alert-beep-sound-effect.mp3",

    // ============================================================
    // GENERAL SETTINGS
    // ============================================================
    "enableSound": true,
    "enableToast": true,
    "wakeMonitor": true,
    "forceVolume": true,
    "debugLog": false
}
`;
};

/**
 * Copy bundled assets (sound files) to the OpenCode config directory.
 * @param {string} configDir - The OpenCode config directory path
 */
const copyBundledAssets = (configDir) => {
  try {
    const pluginDir = getPluginDir();
    const sourceAssetsDir = path.join(pluginDir, 'assets');
    const targetAssetsDir = path.join(configDir, 'assets');

    // Check if source assets exist (they should be bundled with the plugin)
    if (!fs.existsSync(sourceAssetsDir)) {
      return; // No bundled assets to copy
    }

    // Create target assets directory if it doesn't exist
    if (!fs.existsSync(targetAssetsDir)) {
      fs.mkdirSync(targetAssetsDir, { recursive: true });
    }

    // Copy each asset file if it doesn't already exist in target
    const assetFiles = fs.readdirSync(sourceAssetsDir);
    for (const file of assetFiles) {
      const sourcePath = path.join(sourceAssetsDir, file);
      const targetPath = path.join(targetAssetsDir, file);

      // Only copy if target doesn't exist (don't overwrite user customizations)
      if (!fs.existsSync(targetPath) && fs.statSync(sourcePath).isFile()) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  } catch (error) {
    // Silently fail - assets are optional
  }
};

/**
 * Loads a configuration file from the OpenCode config directory.
 * If the file doesn't exist, creates a default config file.
 * @param {string} name - Name of the config file (without .jsonc extension)
 * @param {object} defaults - Default values if file doesn't exist or is invalid
 * @returns {object}
 */
export const loadConfig = (name, defaults = {}) => {
  const configDir = process.env.OPENCODE_CONFIG_DIR || path.join(os.homedir(), '.config', 'opencode');
  const filePath = path.join(configDir, `${name}.jsonc`);

  if (!fs.existsSync(filePath)) {
    // Auto-create the default config file
    try {
      // Ensure config directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Write the default config
      const defaultConfig = generateDefaultConfig();
      fs.writeFileSync(filePath, defaultConfig, 'utf-8');

      // Also copy bundled assets (sound files) to the config directory
      copyBundledAssets(configDir);

      // Parse and return the newly created config merged with defaults
      const config = parseJSONC(defaultConfig);
      return { ...defaults, ...config };
    } catch (error) {
      // If we can't create the file, just return defaults
      return defaults;
    }
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = parseJSONC(content);
    return { ...defaults, ...config };
  } catch (error) {
    // Silently return defaults - don't use console.error as it breaks TUI
    return defaults;
  }
};
