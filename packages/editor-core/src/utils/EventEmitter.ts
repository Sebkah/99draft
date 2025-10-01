/**
 * A lightweight, type-safe event emitter for the editor core
 * Provides subscription-based event handling without external dependencies
 */

// Type for event listener functions
type EventListener<T = any> = (data: T) => void;

// Map to store event name to data type mappings
export interface EventMap {
  [eventName: string]: any;
}

/**
 * Generic EventEmitter class that can be inherited by other classes
 * Provides type-safe event emission and subscription
 */
export class EventEmitter<TEventMap extends EventMap = EventMap> {
  private listeners: Map<keyof TEventMap, Set<EventListener<any>>> = new Map();

  /**
   * Subscribe to an event
   * @param eventName - Name of the event to listen for
   * @param listener - Function to call when event is emitted
   * @returns Unsubscribe function to remove this listener
   */
  on<K extends keyof TEventMap>(eventName: K, listener: EventListener<TEventMap[K]>): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    const eventListeners = this.listeners.get(eventName)!;
    eventListeners.add(listener);

    // Return unsubscribe function
    return () => {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    };
  }

  /**
   * Subscribe to an event but only fire once
   * @param eventName - Name of the event to listen for
   * @param listener - Function to call when event is emitted
   * @returns Unsubscribe function to remove this listener
   */
  once<K extends keyof TEventMap>(eventName: K, listener: EventListener<TEventMap[K]>): () => void {
    const unsubscribe = this.on(eventName, (data) => {
      unsubscribe();
      listener(data);
    });
    return unsubscribe;
  }

  /**
   * Remove a specific listener for an event
   * @param eventName - Name of the event
   * @param listener - The listener function to remove
   */
  off<K extends keyof TEventMap>(eventName: K, listener: EventListener<TEventMap[K]>): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * Remove all listeners for a specific event or all events
   * @param eventName - Optional event name to clear. If not provided, clears all events
   */
  removeAllListeners<K extends keyof TEventMap>(eventName?: K): void {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Emit an event to all subscribers
   * @param eventName - Name of the event to emit
   * @param data - Data to pass to event listeners
   */
  protected emit<K extends keyof TEventMap>(eventName: K, data: TEventMap[K]): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      // Create array to prevent issues if listeners modify the set during iteration
      const listenersArray = Array.from(eventListeners);
      for (const listener of listenersArray) {
        try {
          listener(data);
        } catch (error) {
          // Log error but don't break other listeners
          console.error(`Error in event listener for ${String(eventName)}:`, error);
        }
      }
    }
  }

  /**
   * Check if there are any listeners for a specific event
   * @param eventName - Name of the event to check
   * @returns True if there are listeners for this event
   */
  hasListeners<K extends keyof TEventMap>(eventName: K): boolean {
    const eventListeners = this.listeners.get(eventName);
    return eventListeners ? eventListeners.size > 0 : false;
  }

  /**
   * Get the number of listeners for a specific event
   * @param eventName - Name of the event
   * @returns Number of listeners for this event
   */
  listenerCount<K extends keyof TEventMap>(eventName: K): number {
    const eventListeners = this.listeners.get(eventName);
    return eventListeners ? eventListeners.size : 0;
  }

  /**
   * Get all event names that have listeners
   * @returns Array of event names
   */
  eventNames(): Array<keyof TEventMap> {
    return Array.from(this.listeners.keys());
  }
}
