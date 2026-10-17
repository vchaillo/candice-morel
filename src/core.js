/**
 * Pure application helpers shared by the browser and Node.js tests.
 * No Firebase, DOM or network dependencies.
 */
export const CONTENT_CONFIG = Object.freeze({
  projects: Object.freeze({
    label: "Projet",
    fields: [
      ["category", "Catégorie", ["Théâtre", "Cinéma", "Performance", "Écriture", "Autre"]],
      ["year", "Année", null],
    ],
  }),
  book: Object.freeze({ label: "Photographie", fields: [] }),
  workshops: Object.freeze({
    label: "Atelier",
    fields: [
      ["audience", "Public", ["Enfants", "Adolescents", "Adultes", "Entreprises", "Tous publics"]],
      ["format", "Format", ["Cours collectif", "Atelier", "Stage", "Intervention", "Formation"]],
    ],
  }),
});

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function isAuthorizedAdmin(user, allowedIds) {
  return Boolean(user?.uid && allowedIds.has(user.uid));
}

export function isPublished(item) {
  return item?.published === true;
}

export function visibleItems(items, admin = false) {
  return admin ? [...items] : items.filter(isPublished);
}

export function contentStats(items) {
  const published = items.filter(isPublished).length;
  return { total: items.length, published, drafts: items.length - published };
}

export function initialsFromName(name, email = "") {
  const source = String(name || email.split("@")[0] || "").trim();
  return source.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((word) => word[0].toLocaleUpperCase("fr")).join("");
}

export function hasUnsavedChanges(initialEntries, currentEntries, imageChanged = false) {
  return imageChanged || JSON.stringify(currentEntries) !== JSON.stringify(initialEntries);
}

export function normalizeEditableText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

export function validateContent(kind, data) {
  if (!Object.hasOwn(CONTENT_CONFIG, kind)) {
    return { valid: false, errors: ["Type de contenu inconnu."] };
  }
  const errors = [];
  if (!String(data.title ?? "").trim()) errors.push("Le titre est obligatoire.");
  if (String(data.title ?? "").trim().length > 100) errors.push("Le titre est trop long.");
  if (!String(data.description ?? "").trim()) errors.push("La description est obligatoire.");
  const requiredField = kind === "projects" ? "category" : "audience";
  const choices = CONTENT_CONFIG[kind].fields.find(([name]) => name === requiredField)[2];
  if (!choices.includes(data[requiredField])) {
    errors.push(kind === "projects" ? "Choisissez une catégorie." : "Choisissez un public.");
  }
  return { valid: errors.length === 0, errors };
}

export function getImageCrop(imageWidth, imageHeight, canvasWidth, canvasHeight, zoom, offsetX, offsetY) {
  if ([imageWidth, imageHeight, canvasWidth, canvasHeight].some((n) => !Number.isFinite(n) || n <= 0)) {
    throw new RangeError("Dimensions d’image invalides.");
  }
  const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight) * Math.max(1, zoom);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const x = (canvasWidth - width) * Math.max(0, Math.min(1, offsetX));
  const y = (canvasHeight - height) * Math.max(0, Math.min(1, offsetY));
  return { x, y, width, height };
}

export function moveImageCrop(start, movement, imageSize, canvasSize) {
  if (imageSize <= canvasSize) return 0.5;
  return Math.max(0, Math.min(1, start - movement / (imageSize - canvasSize)));
}

export function isImageSizeAllowed(size, limit = 15 * 1024 * 1024) {
  return Number.isFinite(size) && size > 0 && size <= limit;
}

export function isCompressedImageAllowed(dataUrl, maxLength = 500000) {
  return typeof dataUrl === "string" && dataUrl.startsWith("data:image/jpeg;base64,")
    && dataUrl.length <= maxLength;
}
