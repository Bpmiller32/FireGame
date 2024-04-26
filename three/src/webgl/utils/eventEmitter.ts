/* -------------------------------------------------------------------------- */
/*                          Typescript event emitter                          */
/* -------------------------------------------------------------------------- */

type Listener<T extends Array<any>> = (...args: T) => void;

export default class EventEmitter<EventMap extends Record<string, Array<any>>> {
  private eventListeners: {
    [K in keyof EventMap]?: Set<Listener<EventMap[K]>>;
  } = {};

  public on<K extends keyof EventMap>(
    eventName: K,
    listener: Listener<EventMap[K]>
  ) {
    const listeners = this.eventListeners[eventName] ?? new Set();
    listeners.add(listener);
    this.eventListeners[eventName] = listeners;
  }

  public emit<K extends keyof EventMap>(eventName: K, ...args: EventMap[K]) {
    const listeners = this.eventListeners[eventName] ?? new Set();
    for (const listener of listeners) {
      listener(...args);
    }
  }

  public off<K extends keyof EventMap>(eventName: K) {
    this.eventListeners[eventName]?.clear();
  }
}
