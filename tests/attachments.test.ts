import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const {
  validateAttachments,
} = require("../functions/lib/src/domain/attachments.js");
const text = {
  name: "nota.txt",
  mime: "text/plain",
  base64: Buffer.from("Hola").toString("base64"),
  size: 4,
};
test("small photos and PDF/TXT attachments are accepted without changing their content", () => {
  const bytes = Buffer.from("%PDF-1.7\nexample"),
    pdf = {
      name: "actividad.pdf",
      mime: "application/pdf",
      base64: bytes.toString("base64"),
      size: bytes.length,
    };
  assert.deepEqual(validateAttachments([pdf, text]), [pdf, text]);
  assert.deepEqual(validateAttachments(undefined), []);
});
test("attachments reject fake sizes, executable names, path traversal and MIME spoofing", () => {
  for (const v of [
    { ...text, size: 1 },
    { ...text, name: "archivo.exe" },
    { ...text, name: "../nota.txt" },
    { ...text, mime: "application/pdf", name: "falso.pdf" },
  ])
    assert.throws(() => validateAttachments([v]));
});
test("free attachment limits apply to total bytes and count, not each file alone", () => {
  const bytes = Buffer.alloc(150 * 1024, 65),
    a = {
      name: "grande.txt",
      mime: "text/plain",
      base64: bytes.toString("base64"),
      size: bytes.length,
    };
  assert.throws(() => validateAttachments([a, a]), /250 KB/);
  assert.throws(() => validateAttachments([text, text, text, text]));
});

test("the full 250 KB allowance is usable and malformed base64 padding is rejected", () => {
  const bytes = Buffer.alloc(250 * 1024, 65);
  const attachment = {
    name: "limite.txt",
    mime: "text/plain",
    base64: bytes.toString("base64"),
    size: bytes.length,
  };
  assert.deepEqual(validateAttachments([attachment]), [attachment]);
  for (const base64 of ["A=", "A===", "AAAA=", "A=AA", "===="])
    assert.throws(() => validateAttachments([{ ...text, base64 }]));
});
