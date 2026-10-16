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
  assert.equal((html.match(/class="book-tile"/g) || []).length, 5);
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

test("mobile loader has a bounded fallback and home scroll restoration", () => {
  assert.match(html, /history\.scrollRestoration="manual"/);
  assert.match(html, /"app-loading"\);var loader/);
  assert.match(script, /if\(studio\)window\.scrollTo\(0,0\)/);
  assert.match(script, /else if\(!book&&\(!location.hash\|\|location.hash==='#home'\)\)window\.scrollTo\(0,0\)/);
});

test("Studio uses SVG controls instead of platform-dependent glyphs", () => {
  assert.doesNotMatch(html, /✉|♙|Mon profil ↗|Déconnexion ↗|>Afficher<|>Masquer</);
  assert.match(html, /class="eye-visible"/);
  assert.match(html, /class="eye-hidden"/);
  assert.match(script, /const visibilityIcon=/);
  assert.match(script, /const pencilIcon=/);
  assert.match(script, /data-toggle=/);
  assert.match(script, /\.onclick=\(\)=>\{const \[kind,id\]=el\.dataset\.toggle/);
});

test("Book header and mobile navigation have dedicated contrast rules", () => {
  assert.match(css, /body\.book-active > header/);
  assert.match(css, /header nav\{display:flex;justify-content:center;align-items:center;flex-wrap:wrap/);
});

test("contact and footer share one section with preserved form anchor", () => {
  assert.match(html, /<footer class="footer editorial-footer contact-footer" id="contact">/);
  assert.equal((html.match(/id="contact-form"/g) || []).length, 1);
  assert.equal((html.match(/id="contact"/g) || []).length, 1);
  assert.match(html, /class="contact-footer-grid"/);
});

test("Book opens as an inert, closable overlay with its own scrolling area", () => {
  assert.match(html, /id="book-page"[^>]*aria-hidden="true" inert/);
  assert.match(html, /class="book-close"/);
  assert.match(html, /class="book-scroll"/);
  assert.match(script, /classList\.toggle\('book-open',book\)/);
  assert.match(script, /location\.hash=bookReturnHash/);
  assert.match(css, /\.book-page\.book-open/);
  assert.match(css, /\.book-scroll\{height:100%;overflow-y:auto/);
});

test("Book is a modal with a bare close icon and no section number", () => {
  assert.match(html, /id="book-page" role="dialog" aria-modal="true"/);
  assert.doesNotMatch(html, /PORTFOLIO PHOTOGRAPHIQUE · 05/);
  assert.match(css, /\.book-page\{z-index:9000!important/);
  assert.match(css, /\.book-close\{border:0!important/);
  assert.match(script, /event\.key==='Escape'\)\{event\.preventDefault\(\);location\.hash=bookReturnHash/);
});

test("mobile contact form precedes the name and social links", () => {
  assert.match(css, /\.contact-footer-form\{order:0;width:100%\}/);
  assert.match(css, /\.contact-footer-brand\{order:1;width:100%/);
});

test("Book references five local Candice photographs", () => {
  assert.equal((html.match(/assets\/book\/candice-\d\d\.webp/g) || []).length, 5);
  assert.match(html, /05 PHOTOGRAPHIES/);
});

test("Book slide keeps original header and scrollbars stable", () => {
  assert.match(html, /class="book-monogram"/);
  assert.match(css, /html\{scrollbar-gutter:stable\}/);
  assert.match(css, /body\.book-active\{overflow:visible!important\}/);
  assert.match(css, /body\.book-active>header\{position:absolute!important/);
  assert.match(css, /\.book-close:hover svg\{transform:none!important\}/);
});
