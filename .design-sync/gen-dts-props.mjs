// Generates cfg.dtsPropsFor from the component SOURCES.
//
// Why: poolWebApp ships no .d.ts tree, so the converter's extractor has nothing
// to read and emits `[key: string]: unknown` for every component — which is the
// contract the design agent codes against, so it must be real. This resolves
// each component's props type with the TypeScript checker (repo tsconfig +
// @types/react) and writes a props body per component into config.json.
//
//   node .design-sync/gen-dts-props.mjs
//
// Re-run whenever component props change.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, Node, ts } from '../.ds-sync/node_modules/ts-morph/dist/ts-morph.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const cfg = JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'));
const gen = JSON.parse(readFileSync(join(HERE, '.generated.json'), 'utf8'));

const project = new Project({
  tsConfigFilePath: join(ROOT, 'tsconfig.json'),
  skipAddingFilesFromTsConfig: false,
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, strict: true, skipLibCheck: true, noEmit: true },
});

// Props every DOM element carries. Emitting React's full HTMLAttributes surface
// (~250 entries) would bury the props that actually carry the design language,
// so inherited DOM props are dropped EXCEPT this curated set — the ones a design
// agent genuinely composes with. (Every component still spreads the rest onto
// its root element; that's stated once in the conventions header.)
const KEEP_DOM = new Set([
  'children', 'className', 'style', 'id',
  'href', 'target', 'type', 'name', 'placeholder', 'value', 'defaultValue',
  'disabled', 'required', 'readOnly', 'checked', 'defaultChecked',
  'onClick', 'onChange', 'htmlFor', 'rows', 'colSpan', 'rowSpan',
  'src', 'alt', 'width', 'height', 'min', 'max', 'step', 'maxLength',
]);
const DROP_ALWAYS = new Set(['key', 'ref', 'dangerouslySetInnerHTML', 'suppressHydrationWarning', 'suppressContentEditableWarning']);

const isRepoDecl = (d) => {
  const f = d.getSourceFile().getFilePath();
  return f.startsWith(ROOT.replace(/\\/g, '/')) && !f.includes('/node_modules/');
};

// Trim checker type text down to something readable in a .d.ts: strip import()
// qualifiers and collapse anything hopeless to a safe supertype.
function typeText(type, node) {
  let t;
  try {
    t = type.getText(node, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
  } catch {
    return 'unknown';
  }
  t = t.replace(/import\("[^"]*"\)\./g, '').replace(/\s+/g, ' ').trim();
  if (t.length > 200 || t.includes('{') || t.includes('=>') && t.length > 120) {
    // Keep unions of string literals even when long — that's the variant axis.
    if (!/^"([^"]*)"(\s*\|\s*"[^"]*")*$/.test(t)) return t.includes('=>') ? '(...args: any[]) => void' : 'unknown';
  }
  return t;
}

const NO_PROPS = Symbol('no-props');

// Resolve the props type of a component declaration.
function propsTypeOf(decl) {
  // export function Name(props: P)
  if (Node.isFunctionDeclaration(decl) || Node.isArrowFunction(decl) || Node.isFunctionExpression(decl)) {
    const p = decl.getParameters()[0];
    // Zero parameters is a real, knowable contract — "takes no props" — not an
    // extraction failure. Distinguish it so it never degrades to `unknown`.
    return p ? p.getType() : NO_PROPS;
  }
  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    // React.forwardRef<E, P>(render) — the props type is the 2nd type arg, or
    // failing that the render fn's first parameter.
    if (init && Node.isCallExpression(init)) {
      const targs = init.getTypeArguments();
      if (targs.length >= 2) return targs[1].getType();
      const arg0 = init.getArguments()[0];
      if (arg0 && (Node.isArrowFunction(arg0) || Node.isFunctionExpression(arg0))) {
        const p = arg0.getParameters()[0];
        if (p) return p.getType();
      }
    }
    // const X: React.FC<P> = …
    const tn = decl.getTypeNode();
    if (tn) {
      const targs = Node.isTypeReference(tn) ? tn.getTypeArguments() : [];
      if (targs.length) return targs[0].getType();
    }
    if (init) {
      const sigs = init.getType().getCallSignatures();
      if (sigs.length) {
        const p = sigs[0].getParameters()[0];
        if (p) return p.getTypeAtLocation(decl);
      }
    }
  }
  return null;
}

function bodyFor(name, relFile) {
  const sf = project.addSourceFileAtPathIfExists(join(ROOT, relFile));
  if (!sf) return null;
  const decls = sf.getExportedDeclarations().get(name)
    ?? sf.getExportedDeclarations().get('default');
  if (!decls?.length) return null;
  const decl = decls.find((d) => Node.isFunctionDeclaration(d) || Node.isVariableDeclaration(d)) ?? decls[0];
  const type = propsTypeOf(decl);
  if (type === NO_PROPS) return '  /** This component takes no props. */';
  if (!type) return null;

  // A union of prop shapes (StickerButton: link-props | button-props) — merge
  // every constituent so the contract shows the full surface.
  const constituents = type.isUnion() ? type.getUnionTypes() : [type];
  // A prop is only genuinely required when EVERY branch of the union demands
  // it. StickerButton's link branch declares `href: string` while its button
  // branch has none — reporting that as required would be wrong.
  const requiredEverywhere = new Map();
  for (const t of constituents) {
    const here = new Set(t.getProperties().filter((p) => !(p.isOptional?.() ?? true)).map((p) => p.getName()));
    for (const p of t.getProperties()) {
      const n = p.getName();
      if (!requiredEverywhere.has(n)) requiredEverywhere.set(n, 0);
      if (here.has(n)) requiredEverywhere.set(n, requiredEverywhere.get(n) + 1);
    }
  }
  const out = new Map();
  const variants = new Map();
  for (const t of constituents) {
    for (const prop of t.getProperties()) {
      const pname = prop.getName();
      if (DROP_ALWAYS.has(pname) || pname.startsWith('__')) continue;
      const pdecls = prop.getDeclarations();
      const own = pdecls.some(isRepoDecl);
      if (!own && !KEEP_DOM.has(pname)) continue;
      const pt = prop.getTypeAtLocation(decl);
      const optional = (requiredEverywhere.get(pname) ?? 0) < constituents.length;
      let tt = typeText(pt, decl);
      // `?` already conveys optionality — the trailing `| undefined` is noise.
      if (optional) tt = tt.replace(/\s*\|\s*undefined\b/g, '').trim() || 'unknown';
      // A union of prop shapes narrows the absent branch to `undefined`
      // (StickerButton's button branch declares `href?: undefined`) — those
      // carry no information. Branches that DO differ get unioned, or
      // Accordion's `type` would report only "multiple" and the agent would
      // never learn "single" exists.
      if (tt === 'undefined' || tt === 'never') continue;
      const seen = variants.get(pname) ?? new Set();
      seen.add(tt);
      variants.set(pname, seen);
      const merged = seen.size > 1 && seen.size <= 4 && [...seen].every((s) => s.length < 60)
        ? [...seen].join(' | ')
        : [...seen][0];
      out.set(pname, `  ${pname}${optional ? '?' : ''}: ${merged};`);
    }
  }
  if (!out.size) return null;
  // Own props first (the design language), curated DOM props after.
  const ownNames = new Set();
  for (const t of constituents) {
    for (const prop of t.getProperties()) {
      if (prop.getDeclarations().some(isRepoDecl)) ownNames.add(prop.getName());
    }
  }
  const lines = [...out.entries()].sort(([a], [b]) => {
    const ao = ownNames.has(a) ? 0 : 1, bo = ownNames.has(b) ? 0 : 1;
    return ao - bo || a.localeCompare(b);
  }).map(([, v]) => v);
  return lines.join('\n');
}

// The emitted <Name>.d.ts only imports React — any other name the checker
// printed (a repo-local alias like ChartPoint, or a bare `ReactNode` from a
// file that did `import type {ReactNode}`) would be an unresolved identifier
// and fail validate's [DTS_PARSE] gate. Compile each candidate body in
// isolation and repair whatever doesn't resolve.
const scratch = new Project({
  useInMemoryFileSystem: false,
  skipAddingFilesFromTsConfig: true,
  compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX, skipLibCheck: true, strict: false, noEmit: true,
  },
});
const REACT_TYPES = new Set(
  scratch.addSourceFileAtPath(join(ROOT, 'node_modules/@types/react/index.d.ts'))
    .getModuleOrThrow('React').getExportedDeclarations().keys(),
);

// Structural text for a repo-local interface/type alias, when short enough to
// be more useful inline than `unknown`.
const inlineCache = new Map();
function inlineLocal(id) {
  if (inlineCache.has(id)) return inlineCache.get(id);
  let text = null;
  for (const sf of project.getSourceFiles()) {
    const p = sf.getFilePath();
    if (p.includes('/node_modules/') || !p.startsWith(ROOT.replace(/\\/g, '/'))) continue;
    const node = sf.getInterface(id) ?? sf.getTypeAlias(id);
    if (!node) continue;
    try {
      // An interface's own type text is just its NAME — compose the shape from
      // its members instead, or the replacement is a silent no-op that ships an
      // unresolvable identifier.
      const members = node.getType().getProperties().map((p) => {
        const t = p.getTypeAtLocation(node).getText(node, ts.TypeFormatFlags.NoTruncation)
          .replace(/import\("[^"]*"\)\./g, '').replace(/\s+/g, ' ').trim();
        return `${p.getName()}${p.isOptional?.() ? '?' : ''}: ${t}`;
      });
      const t = `{ ${members.join('; ')} }`;
      if (members.length && t.length <= 160 && !/\b(unknown|any)\b/.test(t) && !t.includes('=>')) text = t;
    } catch {}
    break;
  }
  inlineCache.set(id, text);
  return text;
}

function repair(name, body) {
  let cur = body;
  for (let pass = 0; pass < 6; pass++) {
    // Checked as .ts, NOT .d.ts: skipLibCheck (which the converter's own
    // validate also sets) suppresses every diagnostic inside a declaration
    // file, so an unresolved name there is silently accepted here and only
    // explodes in the design agent's editor.
    const f = scratch.createSourceFile(
      join(ROOT, `.ds-dts-check-${name}.ts`),
      `import * as React from 'react';\nexport interface ${name}Props {\n${cur}\n}\n`,
      { overwrite: true },
    );
    const bad = new Set();
    for (const d of f.getPreEmitDiagnostics()) {
      const m = /Cannot find name '([^']+)'|Namespace .* has no exported member '([^']+)'/.exec(
        typeof d.getMessageText() === 'string' ? d.getMessageText() : d.getMessageText().getMessageText(),
      );
      if (m) bad.add(m[1] || m[2]);
    }
    scratch.removeSourceFile(f);
    if (!bad.size) return cur;
    for (const id of bad) {
      const rx = new RegExp(`(?<![\\w.])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      // A React type printed bare (ReactNode) just needs qualifying. Anything
      // else is a repo-local type the .d.ts can't import: inline its shape when
      // that's still readable (ChartPoint → {label: string; value: number}),
      // else widen to unknown rather than ship a name that doesn't resolve.
      // Last pass widens unconditionally: an inline expansion that itself
      // fails to resolve must not survive as an unresolvable name.
      const repl = REACT_TYPES.has(id)
        ? `React.${id}`
        : (pass < 4 ? inlineLocal(id) ?? 'unknown' : 'unknown');
      cur = cur.replace(rx, repl);
    }
  }
  return cur;
}

const props = {};
let ok = 0, noProps = 0, miss = [];
for (const name of gen.components) {
  const rel = gen.srcMap[name];
  let body = null;
  try { body = bodyFor(name, rel); } catch { body = null; }
  if (!body) { miss.push(name); continue; }
  if (body.includes('takes no props')) noProps++;
  else body = repair(name, body);
  props[name] = body;
  ok++;
}

// Final proof: every body must compile standalone. validate's own .d.ts check
// runs with skipLibCheck and cannot catch this, so it is checked here or nowhere.
const unresolved = [];
for (const [name, body] of Object.entries(props)) {
  const f = scratch.createSourceFile(
    join(ROOT, `.ds-dts-verify-${name}.ts`),
    `import * as React from 'react';\nexport interface ${name}Props {\n${body}\n}\n`,
    { overwrite: true },
  );
  const errs = f.getPreEmitDiagnostics();
  if (errs.length) unresolved.push(`${name}: ${(() => { const m = errs[0].getMessageText(); return typeof m === 'string' ? m : m.getMessageText(); })()}`);
  scratch.removeSourceFile(f);
}
if (unresolved.length) {
  console.error(`✗ ${unresolved.length} prop bodies do not compile:\n  ` + unresolved.join('\n  '));
  process.exit(1);
}

cfg.dtsPropsFor = Object.fromEntries(Object.entries(props).sort());
writeFileSync(join(HERE, 'config.json'), JSON.stringify(cfg, null, 2) + '\n');
console.error(`  dtsPropsFor: ${ok}/${gen.components.length} resolved (${noProps} take no props)`);
if (miss.length) console.error(`  ! unresolved (stay [key: string]: unknown): ${miss.join(', ')}`);
