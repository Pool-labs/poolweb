import type { Firestore } from 'firebase-admin/firestore';

/**
 * A minimal in-memory stand-in for the Admin-SDK Firestore — only the calls
 * `lib/waitlist/store.ts` makes: doc get, equality / `in` queries with a
 * limit, whole-collection get, and transactions with create / update / delete.
 *
 * It records every WHOLE-COLLECTION read in `collectionScans`, so tests can
 * assert that the public paths never list the collection.
 */

type Data = Record<string, unknown>;

class FakeDocSnapshot {
  constructor(
    readonly ref: FakeDocRef,
    private readonly value: Data | undefined,
  ) {}
  get id() {
    return this.ref.id;
  }
  get exists() {
    return this.value !== undefined;
  }
  data() {
    return this.value === undefined ? undefined : structuredClone(this.value);
  }
}

class FakeDocRef {
  constructor(
    private readonly db: FakeFirestore,
    readonly collectionName: string,
    readonly id: string,
  ) {}
  async get() {
    return new FakeDocSnapshot(this, this.db.read(this.collectionName, this.id));
  }
}

type Filter = { field: string; op: '==' | 'in'; value: unknown };

class FakeQuery {
  constructor(
    protected readonly db: FakeFirestore,
    readonly collectionName: string,
    private readonly filters: Filter[] = [],
    private readonly max?: number,
  ) {}
  where(field: string, op: '==' | 'in', value: unknown) {
    if (op !== '==' && op !== 'in') throw new Error(`fake Firestore: unsupported operator ${op}`);
    return new FakeQuery(this.db, this.collectionName, [...this.filters, { field, op, value }], this.max);
  }
  limit(n: number) {
    return new FakeQuery(this.db, this.collectionName, this.filters, n);
  }
  async get() {
    if (this.filters.length === 0) this.db.collectionScans.push(this.collectionName);
    let docs = [...this.db.docsOf(this.collectionName)]
      .filter(([, data]) =>
        this.filters.every((f) =>
          f.op === '==' ? data[f.field] === f.value : (f.value as unknown[]).includes(data[f.field]),
        ),
      )
      .map(([id, data]) => new FakeDocSnapshot(new FakeDocRef(this.db, this.collectionName, id), data));
    if (this.max !== undefined) docs = docs.slice(0, this.max);
    return { empty: docs.length === 0, size: docs.length, docs };
  }
}

class FakeCollection extends FakeQuery {
  doc(id?: string) {
    return new FakeDocRef(this.db, this.collectionName, id ?? this.db.autoId());
  }
}

type Write =
  | { kind: 'create'; ref: FakeDocRef; data: Data }
  | { kind: 'update'; ref: FakeDocRef; data: Data }
  | { kind: 'delete'; ref: FakeDocRef };

class FakeTransaction {
  readonly writes: Write[] = [];
  get(target: FakeDocRef | FakeQuery) {
    return target.get();
  }
  create(ref: FakeDocRef, data: Data) {
    this.writes.push({ kind: 'create', ref, data });
  }
  update(ref: FakeDocRef, data: Data) {
    this.writes.push({ kind: 'update', ref, data });
  }
  delete(ref: FakeDocRef) {
    this.writes.push({ kind: 'delete', ref });
  }
}

export class FakeFirestore {
  private readonly collections = new Map<string, Map<string, Data>>();
  private counter = 0;
  /** Names of collections read in full (a `get()` with no filter). */
  readonly collectionScans: string[] = [];
  /** How many transactions committed at least one write. */
  writeCommits = 0;

  collection(name: string) {
    return new FakeCollection(this, name);
  }

  async runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>): Promise<T> {
    const tx = new FakeTransaction();
    const result = await fn(tx);
    for (const write of tx.writes) {
      const { collectionName, id } = write.ref;
      const existing = this.read(collectionName, id);
      if (write.kind === 'create') {
        if (existing) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 6 });
        this.seed(collectionName, id, write.data);
      } else if (write.kind === 'update') {
        if (!existing) throw Object.assign(new Error('NOT_FOUND'), { code: 5 });
        this.seed(collectionName, id, { ...existing, ...write.data });
      } else {
        this.docs(collectionName).delete(id);
      }
    }
    if (tx.writes.length > 0) this.writeCommits += 1;
    return result;
  }

  // ─── Test helpers ────────────────────────────────────────────────────────────

  autoId() {
    this.counter += 1;
    return `auto${String(this.counter).padStart(16, '0')}`;
  }

  seed(collectionName: string, id: string, data: Data) {
    this.docs(collectionName).set(id, structuredClone(data));
  }

  read(collectionName: string, id: string): Data | undefined {
    const value = this.docs(collectionName).get(id);
    return value === undefined ? undefined : structuredClone(value);
  }

  docsOf(collectionName: string) {
    return this.docs(collectionName).entries();
  }

  ids(collectionName: string): string[] {
    return [...this.docs(collectionName).keys()];
  }

  asFirestore(): Firestore {
    return this as unknown as Firestore;
  }

  private docs(collectionName: string) {
    let docs = this.collections.get(collectionName);
    if (!docs) {
      docs = new Map();
      this.collections.set(collectionName, docs);
    }
    return docs;
  }
}
