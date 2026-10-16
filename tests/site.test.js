import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const script = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

test("public page contains every required landmark", () => {
  for (const id of ["home", "about", "projects", "workshops", "contact", "studio-login", "admin"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});

test("Studio forms and modal anchors are present", () => {
  for (const id of ["login-form", "logout", "open-profile", "modal-root", "toast-stack", "add", "add-workshop"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});

test("runtime files are linked and exist", () => {
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.ok(existsSync(new URL("../favicon.svg", import.meta.url)));
  assert.ok(existsSync(new URL("../src/core.js", import.meta.url)));
  assert.ok(css.length > 1000);
});

test("all four sections and the hero expose inline-editable content", () => {
  for (const key of ["hero-first", "hero-last", "hero-role", "about-title", "about-description",
    "projects-title", "workshops-title", "contact-title", "contact-description"]) {
    assert.ok(html.includes('data-site-text="' + key + '"'), key);
  }
  assert.match(script, /contentEditable/);
});

test("Firestore protects writes with administrator authorization", () => {
  assert.match(rules, /function isAdmin\(\)/);
  assert.match(rules, /allow create, update, delete: if isAdmin\(\)/);
  assert.match(rules, /match \/siteContent\/introductions/);
  assert.match(rules, /allow read, write: if false/);
});

test("deployment runtime does not rely on unused legacy auth module", () => {
  assert.doesNotMatch(html, /firebase-auth\.js/);
  assert.match(script, /from "\.\/src\/core\.js"/);
});

test("Book has a dedicated route, gallery and accessible lightbox", () => {
  assert.match(html, /href="#book"/);
  assert.match(html, /id="book-page"/);
  assert.match(html, /id="book-lightbox"/);
  assert.equal((html.match(/class="book-tile"/g) || []).length, 8);
  assert.match(script, /book=location.hash==='#book'/);
  assert.match(script, /event.key==='ArrowLeft'/);
  assert.match(script, /event.key==='Escape'/);
});

test("placeholder credits and emoji-like arrows are removed", () => {
  assert.doesNotMatch(html, /PORTRAIT ISSU DU PORTFOLIO DE CANDICE/);
  assert.doesNotMatch(html, /Biographie adaptée de son portfolio professionnel/);
  assert.doesNotMatch(html, /Le formulaire ouvre votre application de messagerie/);
  assert.doesNotMatch(html, /STUDIO ↗|INSTAGRAM ↗|PRÉPARER LE MESSAGE ↗/);
  assert.match(html, /class="link-lock"/);
  assert.match(html, /class="header-cm"/);
});
