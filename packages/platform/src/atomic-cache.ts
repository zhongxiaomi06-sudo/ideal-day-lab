export type CacheSnapshot = { version: string; files: ReadonlyMap<string, string> };

export class AtomicContentCache {
  #active: CacheSnapshot | null = null;
  #staged: CacheSnapshot | null = null;

  get active(): CacheSnapshot | null { return this.#active; }

  stage(snapshot: CacheSnapshot): void { this.#staged = snapshot; }

  activate(requiredPaths: readonly string[]): boolean {
    if (!this.#staged || requiredPaths.some((path) => !this.#staged?.files.has(path))) {
      this.#staged = null;
      return false;
    }
    this.#active = this.#staged;
    this.#staged = null;
    return true;
  }

  rollback(snapshot: CacheSnapshot): void {
    this.#active = snapshot;
    this.#staged = null;
  }
}
