import type { DebugConfig } from '../core/Editor';

/**
 * Debug logging categories for the Editor core
 */
export type LogCategory = keyof DebugConfig['logging'];

/**
 * Editor debug logger that checks configuration before logging
 * Provides categorized logging to help debug specific areas of the editor
 */
export class EditorLogger {
  private getDebugConfig: () => DebugConfig;

  constructor(getDebugConfig: () => DebugConfig) {
    this.getDebugConfig = getDebugConfig;
  }

  /**
   * Log a message if the specified category is enabled in debug config
   * @param category The logging category to check
   * @param message The primary message to log
   * @param optionalParams Additional parameters to log (same as console.log)
   */
  log(category: LogCategory, message?: any, ...optionalParams: any[]): void {
    if (this.getDebugConfig().logging[category]) {
      console.log(`[${category.toUpperCase()}]`, message, ...optionalParams);
    }
  }

  /**
   * Log a warning message if the specified category is enabled in debug config
   * @param category The logging category to check
   * @param message The primary message to log
   * @param optionalParams Additional parameters to log (same as console.warn)
   */
  warn(category: LogCategory, message?: any, ...optionalParams: any[]): void {
    if (this.getDebugConfig().logging[category]) {
      console.warn(`[${category.toUpperCase()}]`, message, ...optionalParams);
    }
  }

  /**
   * Log an error message if the specified category is enabled in debug config
   * @param category The logging category to check
   * @param message The primary message to log
   * @param optionalParams Additional parameters to log (same as console.error)
   */
  error(category: LogCategory, message?: any, ...optionalParams: any[]): void {
    if (this.getDebugConfig().logging[category]) {
      console.error(`[${category.toUpperCase()}]`, message, ...optionalParams);
    }
  }

  /**
   * Convenience method for page management logging
   */
  pageManagement(message?: any, ...optionalParams: any[]): void {
    this.log('pageManagement', message, ...optionalParams);
  }

  /**
   * Convenience method for rendering logging
   */
  rendering(message?: any, ...optionalParams: any[]): void {
    this.log('rendering', message, ...optionalParams);
  }

  /**
   * Convenience method for canvas linking logging
   */
  canvasLinking(message?: any, ...optionalParams: any[]): void {
    this.log('canvasLinking', message, ...optionalParams);
  }

  /**
   * Convenience method for cursor operations logging
   */
  cursorOperations(message?: any, ...optionalParams: any[]): void {
    this.log('cursorOperations', message, ...optionalParams);
  }

  /**
   * Convenience method for text buffer logging
   */
  textBuffer(message?: any, ...optionalParams: any[]): void {
    this.log('textBuffer', message, ...optionalParams);
  }
}

/**
 * Create an EditorLogger instance for a specific editor
 * @param getDebugConfig Function that returns the current debug configuration
 */
export function createEditorLogger(getDebugConfig: () => DebugConfig): EditorLogger {
  return new EditorLogger(getDebugConfig);
}
