import { mkdir, open, readFile, rename, unlink, lstat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  LocalizationDatabase,
  LocalizationRepository,
  StoryRecord,
} from "./types";
/** Local single-writer repository. Atomic rename gives readers an entire old or new snapshot.
 * No network waits inside transactions. An abandoned lock fails closed; never steal live locks. */
export class JsonLocalizationRepository implements LocalizationRepository {
  readonly directory: string;
  constructor(
    directory = process.env.LOCALIZATION_DATA_DIR || ".data/localization",
  ) {
    this.directory = resolve(directory);
    const publicRoot = resolve("public");
    if (
      this.directory === publicRoot ||
      this.directory.startsWith(publicRoot + "/")
    )
      throw new Error(
        "Localization storage must not be exposed through public/",
      );
  }
  private async load(): Promise<LocalizationDatabase> {
    try {
      const path = join(this.directory, "store.json");
      if ((await lstat(path)).isSymbolicLink())
        throw new Error("Refusing symlink storage");
      const data = JSON.parse(
        await readFile(path, "utf8"),
      ) as LocalizationDatabase;
      if (
        data.schemaVersion !== 1 ||
        !data.stories ||
        typeof data.stories !== "object" ||
        Array.isArray(data.stories)
      )
        throw new Error("Unsupported or corrupt localization store");
      return data;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT")
        return { schemaVersion: 1, stories: {} };
      throw e;
    }
  }
  async read(id: number): Promise<StoryRecord | null> {
    return structuredClone((await this.load()).stories[String(id)] ?? null);
  }
  async list(): Promise<StoryRecord[]> {
    return structuredClone(Object.values((await this.load()).stories));
  }
  async transact<T>(fn: (db: LocalizationDatabase) => T): Promise<T> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    if ((await lstat(this.directory)).isSymbolicLink())
      throw new Error("Refusing symlink storage");
    const lockPath = join(this.directory, "write.lock");
    const lock = await open(lockPath, "wx", 0o600).catch((e) => {
      if (e.code === "EEXIST")
        throw new Error(
          "Localization store is locked; retry after the writer completes. An abandoned lock requires operator inspection.",
        );
      throw e;
    });
    const temp = join(this.directory, `.store-${randomUUID()}.tmp`);
    try {
      await lock.writeFile(
        JSON.stringify({ pid: process.pid, at: new Date().toISOString() }),
      );
      const db = await this.load();
      const result = fn(db);
      if (result instanceof Promise)
        throw new Error("Repository transactions must be synchronous");
      const file = await open(temp, "wx", 0o600);
      try {
        await file.writeFile(JSON.stringify(db, null, 2));
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temp, join(this.directory, "store.json"));
      return structuredClone(result);
    } finally {
      await unlink(temp).catch(() => {});
      await lock.close();
      await unlink(lockPath);
    }
  }
}
