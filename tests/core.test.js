import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTENT_CONFIG, escapeHtml, isAuthorizedAdmin, isPublished, visibleItems,
  contentStats, initialsFromName, hasUnsavedChanges, normalizeEditableText,
  validateContent, getImageCrop, moveImageCrop, isImageSizeAllowed,
  isCompressedImageAllowed,
} from "../src/core.js";

test("HTML escaping handles injection and null", () => {
  assert.equal(escapeHtml('<img src="x" onerror=\'x\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;x&#39;&gt;&amp;');
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(42), "42");
});

test("authorization checks UID, never email alone", () => {
  const admins = new Set(["uid-1"]);
  assert.equal(isAuthorizedAdmin({ uid: "uid-1" }, admins), true);
  assert.equal(isAuthorizedAdmin({ uid: "other", email: "admin@example.com" }, admins), false);
  assert.equal(isAuthorizedAdmin(null, admins), false);
});

test("public sees published items only, admins see all", () => {
  const items = [{ published: true }, { published: false }, {}, { published: 1 }];
  assert.equal(isPublished(items[0]), true);
  assert.equal(isPublished(items[3]), false);
  assert.equal(visibleItems(items).length, 1);
  assert.equal(visibleItems(items, true).length, 4);
  assert.deepEqual(contentStats(items), { total: 4, published: 1, drafts: 3 });
  assert.deepEqual(contentStats([]), { total: 0, published: 0, drafts: 0 });
});

test("profile initials work with names, emails and empty values", () => {
  assert.equal(initialsFromName("Candice Morel"), "CM");
  assert.equal(initialsFromName("", "candice@example.com"), "C");
  assert.equal(initialsFromName(""), "");
  assert.equal(initialsFromName("  Jean   Pierre Dupont  "), "JP");
});

test("dirty form detection covers changes, reverts and image edits", () => {
  const before = [["title", "Bonjour"], ["published", "on"]];
  assert.equal(hasUnsavedChanges(before, before), false);
  assert.equal(hasUnsavedChanges(before, [["title", "Salut"], ["published", "on"]]), true);
  assert.equal(hasUnsavedChanges(before, before, true), true);
});

test("inline text normalization keeps single spaces and trims", () => {
  assert.equal(normalizeEditableText("  Bonjour\n   Candice  "), "Bonjour Candice");
  assert.equal(normalizeEditableText(null), "");
});

test("required fields reject empty title, description and category", () => {
  const base = { title: "Projet", description: "Description", category: "Théâtre" };
  assert.equal(validateContent("projects", base).valid, true);
  assert.equal(validateContent("projects", { ...base, title: " " }).valid, false);
  assert.equal(validateContent("projects", { ...base, description: "\n" }).valid, false);
  assert.equal(validateContent("projects", { ...base, category: "" }).valid, false);
  assert.equal(validateContent("projects", { ...base, category: "Inconnue" }).valid, false);
  assert.equal(validateContent("projects", { ...base, title: "a".repeat(101) }).valid, false);
});

test("workshop audience is mandatory and validated", () => {
  assert.equal(validateContent("workshops", { title: "Atelier", description: "Texte", audience: "Adultes" }).valid, true);
  assert.equal(validateContent("workshops", { title: "Atelier", description: "Texte" }).valid, false);
  assert.equal(validateContent("unknown", { title: "X" }).valid, false);
  assert.equal(CONTENT_CONFIG.projects.fields[0][0], "category");
});

test("crop covers canvas without distortion at minimum zoom", () => {
  assert.deepEqual(getImageCrop(1000, 500, 480, 300, 1, 0.5, 0.5), {
    x: -60, y: 0, width: 600, height: 300,
  });
  const crop = getImageCrop(500, 1000, 480, 300, 1.5, 0.5, 0.5);
  assert.ok(crop.width >= 480 && crop.height >= 300);
  assert.ok(crop.x <= 0 && crop.y <= 0);
});

test("crop positions clamp to boundaries and reject invalid dimensions", () => {
  const crop = getImageCrop(1000, 500, 480, 300, 1, -5, 10);
  assert.equal(Math.abs(crop.x), 0);
  assert.equal(Math.abs(crop.y), 0);
  assert.throws(() => getImageCrop(0, 100, 480, 300, 1, 0.5, 0.5), RangeError);
});

test("dragging changes image position and clamps at edges", () => {
  assert.equal(moveImageCrop(0.5, 10, 600, 300), 0.5 - 10 / 300);
  assert.equal(moveImageCrop(0.5, 999, 600, 300), 0);
  assert.equal(moveImageCrop(0.5, -999, 600, 300), 1);
  assert.equal(moveImageCrop(0.2, 20, 300, 300), 0.5);
});

test("upload size limits and encoded JPEG validation", () => {
  assert.equal(isImageSizeAllowed(1), true);
  assert.equal(isImageSizeAllowed(15 * 1024 * 1024), true);
  assert.equal(isImageSizeAllowed(15 * 1024 * 1024 + 1), false);
  assert.equal(isImageSizeAllowed(0), false);
  assert.equal(isCompressedImageAllowed("data:image/jpeg;base64,AAAA"), true);
  assert.equal(isCompressedImageAllowed("data:image/png;base64,AAAA"), false);
  assert.equal(isCompressedImageAllowed("data:image/jpeg;base64,AAAA", 10), false);
});
