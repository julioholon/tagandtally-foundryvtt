import { SYSTEM_ID } from "./config.mjs";

/**
 * A world setting that every client sees and the GM owns. Players' writes
 * are relayed to the active GM over the system socket (Combat Flow uses the
 * same pattern with its own op). `onChange` re-renders the owning app.
 */
export class WorldState {
  static #handlers = new Map();

  constructor(key, defaults, { onChange } = {}) {
    this.key = key;
    this.defaults = defaults;
    this.onChange = onChange;
  }

  register() {
    game.settings.register(SYSTEM_ID, this.key, { scope: "world", config: false, type: Object, default: foundry.utils.deepClone(this.defaults), onChange: () => this.onChange?.() });
    WorldState.#handlers.set(this.key, this);
  }

  get() {
    const stored = game.settings.get(SYSTEM_ID, this.key);
    return foundry.utils.mergeObject(foundry.utils.deepClone(this.defaults), stored ?? {}, { inplace: false });
  }

  /** Store the state; players ask the GM to do it (and re-render optimistically). */
  async set(state, extra = {}) {
    if (game.user.isGM) {
      await game.settings.set(SYSTEM_ID, this.key, state);
      return this.afterSet?.(extra);
    }
    game.socket.emit(`system.${SYSTEM_ID}`, { op: "worldState", key: this.key, state, extra });
    this.onChange?.();
  }

  /** Register the socket relay once (on ready). */
  static registerSocket() {
    game.socket.on(`system.${SYSTEM_ID}`, async (data) => {
      if (data?.op !== "worldState" || game.user !== game.users.activeGM) return;
      const ws = WorldState.#handlers.get(data.key);
      if (!ws) return;
      await game.settings.set(SYSTEM_ID, data.key, data.state);
      await ws.afterSet?.(data.extra ?? {});
    });
  }
}
