// Shared integrity checks for locale translation work files.
//
// A translation must preserve everything structural about the English source:
// the same key paths, the same types, the same array lengths — and per string,
// the same interpolation placeholders and HTML tags, because those strings are
// rendered into the DOM (`{role}` is replaced at runtime, `<code>` carries
// styling classes). Numbers are compared too but reported as warnings only:
// digit runs usually must match, yet locale formatting can legitimately differ.

/** Interpolation tokens that must survive translation verbatim. */
export function placeholders(s) {
  const out = [];
  for (const m of s.matchAll(/\{[A-Za-z_][A-Za-z0-9_]*\}/g)) out.push(m[0]);
  for (const m of s.matchAll(/\$\{[^}]*\}/g)) out.push(m[0]);
  for (const m of s.matchAll(/%[sd]/g)) out.push(m[0]);
  return out.sort();
}

/** HTML tag multiset, e.g. ['code', 'strong', '/strong'] (tag names only). */
export function tags(s) {
  const out = [];
  for (const m of s.matchAll(/<\/?([A-Za-z][A-Za-z0-9]*)\b[^>]*>/g)) {
    out.push((m[0][1] === '/' ? '/' : '') + m[1].toLowerCase());
  }
  return out.sort();
}

/** Digit runs, used for warnings (e.g. "11-step" must stay 11 steps). */
export function numbers(s) {
  return (s.match(/\d+/g) ?? []).sort();
}

function sameMultiset(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

/**
 * Compare a localized node against the English node.
 * Pushes `{path, msg}` errors (fatal) and warnings (informational).
 */
export function compareNode(enNode, locNode, path, errors, warnings) {
  if (enNode === null || typeof enNode !== 'object') {
    if (locNode === undefined) {
      errors.push({ path, msg: 'missing' });
      return;
    }
    if (typeOf(enNode) !== typeOf(locNode)) {
      errors.push({ path, msg: `type ${typeOf(enNode)} -> ${typeOf(locNode)}` });
      return;
    }
    if (typeof enNode === 'string') compareString(enNode, locNode, path, errors, warnings);
    return;
  }

  if (Array.isArray(enNode)) {
    if (!Array.isArray(locNode)) {
      errors.push({ path, msg: `expected array, got ${typeOf(locNode)}` });
      return;
    }
    if (enNode.length !== locNode.length) {
      errors.push({ path, msg: `array length ${enNode.length} -> ${locNode.length}` });
      return;
    }
    enNode.forEach((v, i) => compareNode(v, locNode[i], `${path}[${i}]`, errors, warnings));
    return;
  }

  if (locNode === null || typeof locNode !== 'object' || Array.isArray(locNode)) {
    errors.push({ path, msg: `expected object, got ${typeOf(locNode)}` });
    return;
  }
  for (const key of Object.keys(enNode)) {
    if (!(key in locNode)) {
      errors.push({ path: `${path}.${key}`, msg: 'missing' });
      continue;
    }
    compareNode(enNode[key], locNode[key], `${path}.${key}`, errors, warnings);
  }
  for (const key of Object.keys(locNode)) {
    if (!(key in enNode)) {
      errors.push({ path: `${path}.${key}`, msg: 'extra key not in English source' });
    }
  }
}

function compareString(enStr, locStr, path, errors, warnings) {
  const enPh = placeholders(enStr);
  const locPh = placeholders(locStr);
  if (!sameMultiset(enPh, locPh)) {
    errors.push({ path, msg: `placeholders [${enPh}] -> [${locPh}]` });
  }
  const enTags = tags(enStr);
  const locTags = tags(locStr);
  if (!sameMultiset(enTags, locTags)) {
    errors.push({ path, msg: `html tags [${enTags}] -> [${locTags}]` });
  }
  const enNums = numbers(enStr);
  const locNums = numbers(locStr);
  if (!sameMultiset(enNums, locNums)) {
    warnings.push({ path, msg: `numbers [${enNums}] -> [${locNums}]` });
  }
}

/** Collect every leaf path (objects recursed, arrays indexed). */
export function leafPaths(node, prefix = '', out = []) {
  if (node === null || typeof node !== 'object') {
    out.push(prefix);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => leafPaths(v, `${prefix}[${i}]`, out));
    return out;
  }
  for (const [key, value] of Object.entries(node)) {
    leafPaths(value, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}
