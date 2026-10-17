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
  assert.match(script, /location\.hash='#home'/);
  assert.match(css, /\.book-page\.book-open/);
  assert.match(css, /\.book-scroll\{height:100%;overflow-y:auto/);
});

test("Book is a modal with a bare close icon and no section number", () => {
  assert.match(html, /id="book-page" role="dialog" aria-modal="true"/);
  assert.doesNotMatch(html, /PORTFOLIO PHOTOGRAPHIQUE · 05/);
  assert.match(css, /\.book-page\{z-index:9000!important/);
  assert.match(css, /\.book-close\{border:0!important/);
  assert.match(script, /event\.key==='Escape'\)\{event\.preventDefault\(\);location\.hash='#home'/);
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

test("Book copy is editable and closing always returns to home", () => {
  for(const key of ['book-eyebrow','book-title','book-description'])assert.match(html,new RegExp('data-site-text="'+key+'"'));
  assert.match(script, /location\.hash='#home'/);
  assert.doesNotMatch(script, /location\.hash=bookReturnHash/);
});

test("editor has single live crop canvas and explicit photo actions", () => {
  assert.doesNotMatch(script, /id="photo-recrop"/);
  assert.match(script, /id="photo-remove"/);
  assert.match(script, /id="crop-canvas"/);
  assert.doesNotMatch(script, /id="image-preview"/);
  assert.match(script, /imageRemoved\?'':/);
  assert.match(script, /name="published"/);
  assert.match(css, /\.custom-modal:has\(\.compact-editor\)\{display:block;overflow-y:auto/);
});

test("Studio keeps save and cancel visible and prevents double scrolling", () => {
 assert.match(css, /body\.studio-modal-active\{overflow:hidden!important\}/);
 assert.match(css, /\.custom-modal #content-editor\.compact-editor \.form-actions\{position:sticky;bottom:0/);
 assert.match(script, /document\.body\.classList\.add\('studio-modal-active'\)/);
 assert.match(script, /document\.body\.classList\.remove\('studio-modal-active'\)/);
});

test("Admin rows expose compact metadata and sortable controls", () => {
 assert.doesNotMatch(script, /class="drag-handle"/);
 assert.match(script, /class="admin-row-image"/);
 assert.match(script, /class="admin-row-meta"/);
 assert.doesNotMatch(script, /formatAdminDate\(p\)/);
 assert.match(script, /function bindSortable\(container,kind\)/);
 assert.match(script, /function animateReorder\(container,change\)/);
 assert.match(script, /writeBatch\(db\)/);
 assert.match(script, /sortOrder:i/);
 assert.match(script, /event\.key==='ArrowUp'/);
});

test("Studio navigation avoids native anchor scroll and supports transition", () => {
 assert.match(script, /history\.pushState\(null,'',destination\)/);
 assert.match(script, /document\.startViewTransition/);
});

test("contact footer fills desktop viewport and enlarges the signature", () => {
 assert.match(css, /\.contact-footer\{min-height:100svh;min-height:100dvh/);
 assert.match(css, /\.contact-footer-grid\{width:100%;max-width:1600px;flex:1/);
 assert.match(css, /\.contact-footer-brand\{grid-area:brand;align-self:center/);
 assert.match(css, /\.contact-footer \.footer-home-link>strong\{font-size:clamp\(82px,9vw,170px\)!important/);
 assert.match(css, /\.contact-footer-brand \.footer-home-link>strong\{font-size:clamp\(64px,14vw,108px\)!important/);
});

test("full-card drag offers a floating preview, a dashed target and persistence", () => {
 assert.match(script, /row\.addEventListener\('pointerdown'/);
 assert.match(script, /ghost=row\.cloneNode\(true\)/);
 assert.match(script, /admin-drop-placeholder/);
 assert.match(script, /window\.addEventListener\('pointermove',onMove/);
 assert.match(script, /persistOrder\(container,kind\)/);
 assert.match(css, /\.admin-sortable \.admin-row-image\{width:112px!important;height:100%!important/);
 assert.match(css, /border:2px dashed #777/);
 assert.doesNotMatch(script, /Mis à jour '\+escapeHtml/);
});

test("tablet footer stacks contact first and uses animated Send action", () => {
 assert.match(css, /@media\(min-width:741px\) and \(max-width:1100px\)/);
 assert.match(css, /\.contact-footer-form\{order:0;width:100%;align-self:stretch\}/);
 assert.match(css, /\.contact-footer-brand\{order:1;width:100%/);
 assert.doesNotMatch(html, /04 —/);
 assert.equal((html.match(/class="contact-required"/g)||[]).length,3);
 assert.match(html, /class="btn contact-send"/);
 assert.match(html, /ENVOYER/);
 assert.match(css, /\.contact-send::before\{content:"";position:absolute/);
 assert.match(css, /transform:scaleX\(0\)/);
 assert.match(css, /transform:scaleX\(1\)/);
});

test("portfolio images keep one 16:10 crop across cards, editor and admin", () => {
 assert.match(css, /\.project-grid article \.image\{aspect-ratio:16\/10/);
 assert.match(css, /\.project-grid article \.image img\{display:block;width:100%;height:100%!important/);
 assert.match(css, /\.portrait-photo img\{aspect-ratio:16\/10!important/);
 assert.match(css, /\.custom-modal \.compact-editor #crop-canvas\{aspect-ratio:16\/10/);
 assert.match(css, /\.admin-sortable \.admin-row-image\{aspect-ratio:16\/10!important/);
});
test("drag preview inherits sortable styles and is excluded from targets", () => {
 assert.match(script, /container\.append\(ghost\)/);
 assert.match(script, /\.admin-row:not\(\.admin-drag-source\):not\(\.admin-drag-ghost\)/);
 assert.match(css, /\.admin-sortable \.admin-drag-ghost\{display:grid!important/);
});
test("editor has one panel-edge scrollbar and a sticky footer", () => {
 assert.match(css, /\.custom-modal:has\(\.compact-editor\)\{inset:0!important;display:flex!important/);
 assert.match(css, /\.custom-modal #content-editor\.compact-editor\{min-height:0!important;max-height:100%;overflow-y:auto!important/);
 assert.match(css, /\.custom-modal #content-editor\.compact-editor \.form-actions\{position:sticky!important/);
});

test("contact send uses editorial underline and sliding right arrow", () => {
 assert.match(html, /<path d="M4 12h16m-7-7 7 7-7 7"\/>/);
 assert.match(css, /\.contact-footer \.contact-form \.contact-send::before\{display:none!important\}/);
 assert.match(css, /\.contact-footer \.contact-form \.contact-send::after\{content:"";position:absolute/);
 assert.match(css, /transform:scaleX\(0\)/);
 assert.match(css, /transform:translateX\(7px\)/);
});

test("drag placeholder replaces the row instead of pushing the list down", () => {
 assert.match(script, /row\.replaceWith\(placeholder\)/);
 assert.doesNotMatch(script, /row\.after\(placeholder\)/);
 assert.match(script, /placeholder\.replaceWith\(row\)/);
 assert.match(css, /\.admin-sortable \.admin-drop-placeholder\{/);
 assert.match(css, /border:1px dashed #bdb8b0/);
 assert.match(css, /animation:none!important/);
});
test("Studio list thumbnails stay at the same 16:10 aspect ratio as published cards", () => {
 assert.match(css, /\.admin-sortable \.admin-row-image,\.admin-sortable \.admin-drag-ghost \.admin-row-image\{/);
 assert.match(css, /height:auto!important/);
 assert.match(css, /aspect-ratio:16\/10!important/);
});

test("Studio tiles have flush 16:10 thumbnails and no modification date", () => {
 assert.doesNotMatch(script, /Dernière modification/);
 assert.match(css, /grid-template-columns:160px minmax\(0,1fr\) auto!important;height:100px!important/);
 assert.match(css, /width:160px!important;height:100px!important/);
});
test("profile shows actual account name in cinematic header", () => {
 assert.match(script, /class="studio-profile"/);
 assert.match(script, /<h2>'\+escapeHtml\(name\)\+'<\/h2>/);
 assert.doesNotMatch(script, /<h2>Mon profil<\/h2>/);
 assert.match(css, /\.studio-profile-header\{background:#151515/);
 assert.match(css, /\.contact-footer \.contact-form \.contact-send::after\{background:#151515!important\}/);
});

test("mobile header keeps CM on the left and Studio actions remain inline", () => {
 assert.match(css, /body>header \.header-monogram\{align-self:flex-start!important/);
 assert.match(css, /\.admin-head \.admin-account-actions\{display:flex;flex-wrap:nowrap!important/);
 assert.match(css, /\.admin-stats\{display:grid!important;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css, /\.admin-sortable \.admin-actions\{grid-column:3!important;grid-row:1!important;display:flex!important;flex-direction:row!important/);
 assert.doesNotMatch(html, /Gérez les projets et les ateliers\. Toutes les modifications sont synchronisées avec Firebase\./);
});

test("crop zoom limits reflect image resolution and cover fit", () => {
 assert.match(script, /const configureZoom=\(\)=>\{/);
 assert.match(script, /const cover=Math\.max\(canvas\.width\/img\.width,canvas\.height\/img\.height\)/);
 assert.match(script, /zoomInput\.min='100'/);
 assert.match(script, /zoomInput\.max=String\(Math\.max\(100,Math\.round\(maxUseful\*100\)\)\)/);
});
test("mobile navigation and modal modes match their intended layouts", () => {
 assert.match(html, /class="nav-contact-icon"/);
 assert.match(css, /body>header nav \.nav-contact-text\{display:none\}/);
 assert.match(css, /body>header nav\{flex:1 1 auto!important/);
 assert.match(script, /class="modal-close" aria-label="Fermer"><svg/);
 assert.match(script, /classList\.add\('is-confirmation'\)/);
 assert.match(css, /\.custom-modal:not\(\.is-confirmation\) \.dialog-shell\{width:100%!important/);
 assert.match(css, /\.custom-modal\.is-confirmation\{inset:0!important;display:flex!important;align-items:center!important/);
});

test("mobile Studio uses image-first cards with content and actions below", () => {
 assert.match(css, /#admin\.admin\{padding-top:73px!important\}/);
 assert.match(css, /#admin \.admin-sortable \.admin-row-image,/);
 assert.match(css, /grid-column:1\/-1!important;grid-row:1!important/);
 assert.match(css, /grid-column:1!important;grid-row:2!important/);
 assert.match(css, /grid-column:2!important;grid-row:2!important/);
 assert.match(css, /-webkit-line-clamp:2/);
});

test("mobile navigation uses readable Contact text and Book header geometry is stable", () => {
 assert.match(css, /body>header nav \.nav-contact-text\{display:inline!important\}/);
 assert.match(css, /body>header nav \.nav-contact-icon\{display:none!important\}/);
 assert.match(css, /body\.book-active>header\{padding:12px 14px!important/);
 assert.match(css, /\.book-monogram\{top:12px!important;left:14px!important/);
});
test("profile enters from above and editor close stays non-sticky", () => {
 assert.match(script, /classList\.add\('is-profile'\)/);
 assert.match(css, /\.custom-modal\.is-profile \.dialog-shell\{transform:translate3d\(0,-105vh,0\)/);
 assert.match(css, /\.custom-modal:not\(\.is-confirmation\) \.modal-close\{position:absolute!important/);
 assert.match(css, /\.compact-editor #crop-zoom::-webkit-slider-thumb/);
 assert.match(css, /calc\(100% - 16px\) 2px no-repeat/);
});

test("Studio provides independent list and card view controls", () => {
 assert.match(html, /data-view="projects:list"/);
 assert.match(html, /data-view="projects:cards"/);
 assert.match(html, /data-view="workshops:list"/);
 assert.match(html, /data-view="workshops:cards"/);
 assert.match(script, /const adminViews=\{projects:'list',workshops:'list'\}/);
 assert.match(script, /container\.classList\.toggle\('admin-view-cards',adminViews\[kind\]==='cards'\)/);
 assert.match(css, /\.admin-sortable\.admin-view-cards\{/);
});
test("mobile header keeps the navigation and monogram on one line", () => {
 assert.match(css, /body>header,body\.book-active>header\{/);
 assert.match(css, /display:flex!important;flex-direction:row!important;align-items:center!important/);
 assert.match(css, /font-size:12px!important;letter-spacing:0!important/);
 assert.match(css, /#admin\.admin\{padding-top:74px!important\}/);
});

test("mobile navigation opens as an accessible top-down editorial panel", () => {
 assert.match(html, /class="mobile-menu-toggle"/);
 assert.match(html, /id="mobile-navigation"/);
 assert.match(script, /function setMobileMenu\(open\)/);
 assert.match(script, /mobileMenu\.inert=!open/);
 assert.match(css, /\.mobile-navigation\.is-open\{transform:translate3d\(0,0,0\)/);
});
test("Book CM is immediate and Studio account buttons are independently positioned", () => {
 assert.match(css, /\.book-monogram,\.book-page\.book-open \.book-monogram\{/);
 assert.match(css, /opacity:1!important;transition:none!important/);
 assert.match(css, /#admin \.admin-head \.admin-account-actions\{\s*position:absolute!important;top:78px!important;right:14px!important/);
 assert.match(css, /\.admin-stats-toolbar\{display:flex;align-items:center/);
 assert.match(html, /class="admin-stats-toolbar"/);
});

test("Book management is integrated into Studio and protected by Firestore rules", () => {
 assert.match(html, /id="add-book"/);
 assert.match(html, /id="book-list"/);
 assert.match(html, /id="book-stats"/);
 assert.match(html, /id="import-book"/);
 assert.match(script, /function renderBook\(published\)/);
 assert.match(script, /editor\('book'\)/);
 assert.match(script, /writeBatch\(db\)/);
 assert.match(rules, /match \/book\/\{photoId\}/);
});
