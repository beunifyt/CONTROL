/**
 * Event Bus
 * Patrón Pub/Sub para que los módulos NO se conozcan entre sí.
 *
 * Convención de nombres: 'modulo:accion'
 *   ✓ 'expense:created', 'vehicle:checkin', 'user:login'
 *   ✗ 'createExpense', 'newVehicleArrived'
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.history = []; // últimos 100 eventos para debug
    this.maxHistory = 100;
  }

  /**
   * Suscribirse a un evento.
   * @returns {Function} unsubscribe
   */
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Suscribirse a un evento solo UNA vez.
   */
  once(event, handler) {
    const off = this.on(event, (data) => {
      off();
      handler(data);
    });
    return off;
  }

  /**
   * Desuscribirse.
   */
  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Emitir un evento.
   */
  emit(event, data) {
    this.history.push({ event, data, ts: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();

    const handlers = this.listeners.get(event);
    if (!handlers) return;

    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EventBus] Handler error in "${event}":`, err);
      }
    });
  }

  /**
   * Limpia todos los listeners de un módulo (cleanup en destroy).
   */
  clearNamespace(prefix) {
    for (const event of this.listeners.keys()) {
      if (event.startsWith(prefix + ':')) this.listeners.delete(event);
    }
  }
}

export const eventBus = new EventBus();
