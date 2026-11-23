export class SafetyRepository {
  docs = new Map(); accounts = new Map(); revision = 0; removedAuth = []; failRemove = false; denyAuth = false; beforeCommit = null;
  seed(path, data) { this.docs.set(path, { path, data: structuredClone(data), version: String(++this.revision) }); }
  async get(path) { return structuredClone(this.docs.get(path) ?? null); }
  async query(collection, filters = [], count = 25, _mask, orderBy, allDescendants = false) {
    const rows = [...this.docs.values()].filter(d => (allDescendants ? d.path.split("/").at(-2) === collection : d.path.startsWith(collection + "/") && d.path.split("/").length === collection.split("/").length + 1) && filters.every(f => f.op === "EQUAL" ? d.data[f.field] === f.value : f.op === "GREATER_THAN" ? d.data[f.field] > f.value : d.data[f.field] <= f.value));
    if (orderBy) rows.sort((a, b) => String(a.data[orderBy]).localeCompare(String(b.data[orderBy])));
    return structuredClone(rows.slice(0, count));
  }
  async commit(writes) {
    if (this.beforeCommit) { const fn = this.beforeCommit; this.beforeCommit = null; await fn(writes); }
    if (writes.some(w => (this.docs.get(w.path)?.version ?? null) !== w.version)) return false;
    writes.forEach(w => this.seed(w.path, w.mask ? { ...this.docs.get(w.path)?.data, ...w.data } : w.data)); return true;
  }
  async accountInfo(uid) { return this.accounts.get(uid) ?? null; }
  async canDeleteAccounts() { return !this.denyAuth; }
  async deleteAuth(uid) { if (this.denyAuth) throw Error("mock permission denied"); this.accounts.delete(uid); this.removedAuth.push(uid); }
  async removeDocuments(paths) { if (this.failRemove) throw Error("mock unavailable"); paths.forEach(p => this.docs.delete(p.path)); return true; }
  member(uid, role = "member") {
    this.accounts.set(uid, { uid, email: `${uid}@example.com`, verified: true, disabled: false, validSince: 0 });
    this.seed(`families/${uid}`, { name: `Familia ${uid}` }); this.seed(`roles/${uid}`, { role });
    this.seed(`community/${uid}`, { uid, alias: `Familia ${uid}`, avatar: null, people: [], visible: true, moderationStatus: "approved", shareAnniversary: true, marriageDate: "2016-11-10", timezone: "America/La_Paz" });
    this.seed(`communityApprovals/${uid}`, { state: "approved", alias: `Familia ${uid}`, avatar: null, people: [] });
    this.seed(`communityConsents/${uid}`, { version: 1 });
    return this;
  }
}
