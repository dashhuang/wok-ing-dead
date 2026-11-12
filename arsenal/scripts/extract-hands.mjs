// Lifts the game's first-person arms (the `weapon_hands` module: rig, skinned mesh, material,
// finger poses, grips, arm IK) out of the published bundle src/game.js into a standalone ES
// module the lab can import, without touching the game.
//
//   node arsenal/scripts/extract-hands.mjs            # writes arsenal/src/kit/gamehands.gen.js
//   node arsenal/scripts/extract-hands.mjs --report   # only print what would be taken
//
// The bundle is one shared scope with shortened names. This script parses it, starts from the
// names the hands module exports, and follows references: every declaration they need is copied
// over, together with the top-level statements that fill in tables those declarations own.
// Engine classes are not copied; they are bound to the stock three.js the lab already uses
// (both are r180), via the bundle's own export table.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";

const GAME = fileURLToPath(new URL("../../src/game.js", import.meta.url));
const OUT = fileURLToPath(
  new URL("../src/kit/gamehands.gen.js", import.meta.url),
);
const REPORT = process.argv.includes("--report");

// exports of the hands module the lab has no use for (its inspection page needs the whole game)
const SKIP_EXPORTS = new Set(["showcase"]);
const SRC = fs.readFileSync(GAME, "utf8");
const ast = parseAst(SRC);
const unwrap = (n) =>
  n && n.type === "ParenthesizedExpression" ? unwrap(n.expression) : n;
const iife = ast.body
  .map((n) => n.type === "ExpressionStatement" && unwrap(n.expression))
  .find(
    (e) =>
      e &&
      e.type === "CallExpression" &&
      unwrap(e.callee).type === "ArrowFunctionExpression",
  );
if (!iife) throw new Error("bundle scope not found");
const BODY = unwrap(iife.callee).body.body;
const text = (n) => SRC.slice(n.start, n.end);
const lineOf = (pos) => SRC.slice(0, pos).split("\n").length;

// Export tables. The bundler gives each module a namespace object filled in by a call
// `helper(ns, { Public: () => local, ... })`. The short names differ from build to build, so
// the two tables needed are recognised by what they export.
function findTable(keys) {
  for (const st of BODY) {
    if (st.type !== "ExpressionStatement") continue;
    const c = unwrap(st.expression);
    if (c.type !== "CallExpression" || c.arguments.length !== 2) continue;
    const callee = unwrap(c.callee),
      ns = unwrap(c.arguments[0]),
      obj = unwrap(c.arguments[1]);
    if (
      callee.type !== "Identifier" ||
      ns.type !== "Identifier" ||
      obj.type !== "ObjectExpression"
    )
      continue;
    const map = new Map();
    let ok = true;
    for (const p of obj.properties) {
      const fn = p.type === "Property" ? unwrap(p.value) : null;
      const v =
        fn && fn.type === "ArrowFunctionExpression" ? unwrap(fn.body) : null;
      if (!v || v.type !== "Identifier") {
        ok = false;
        break;
      }
      map.set(p.key.name ?? p.key.value, v.name);
    }
    if (ok && keys.every((k) => map.has(k)))
      return { map, stmt: st, ns: ns.name, helper: callee.name };
  }
  throw new Error(`no export table with ${keys.join(", ")} in the bundle`);
}
const three = findTable(["Vector3", "WebGLRenderer", "SkinnedMesh"]);
const hands = findTable(["createArm", "armMaterial", "GRIPS"]);
const THREE_NS = three.ns,
  NAMESPACE = hands.ns,
  HELPER = hands.helper;
const threeByLocal = new Map(
  [...three.map].map(([pub, local]) => [local, pub]),
);

// ---------------------------------------------------------------- scope analysis
function patNames(p, out) {
  if (!p) return out;
  switch (p.type) {
    case "Identifier":
      out.push(p.name);
      break;
    case "ObjectPattern":
      for (const pr of p.properties)
        patNames(pr.type === "RestElement" ? pr.argument : pr.value, out);
      break;
    case "ArrayPattern":
      for (const el of p.elements) patNames(el, out);
      break;
    case "AssignmentPattern":
      patNames(p.left, out);
      break;
    case "RestElement":
      patNames(p.argument, out);
      break;
  }
  return out;
}
const isFn = (n) =>
  n.type === "FunctionDeclaration" ||
  n.type === "FunctionExpression" ||
  n.type === "ArrowFunctionExpression";
function blockDecls(stmts, set) {
  for (const s of stmts) {
    if (s.type === "VariableDeclaration" && s.kind !== "var")
      for (const d of s.declarations)
        for (const n of patNames(d.id, [])) set.add(n);
    else if (
      (s.type === "FunctionDeclaration" || s.type === "ClassDeclaration") &&
      s.id
    )
      set.add(s.id.name);
  }
}
function varDecls(n, set) {
  if (!n || typeof n !== "object") return;
  if (Array.isArray(n)) return void n.forEach((c) => varDecls(c, set));
  if (typeof n.type !== "string") return;
  if (isFn(n) || n.type === "ClassDeclaration" || n.type === "ClassExpression")
    return;
  if (n.type === "VariableDeclaration" && n.kind === "var")
    for (const d of n.declarations)
      for (const x of patNames(d.id, [])) set.add(x);
  for (const k in n) {
    if (k === "type" || k === "start" || k === "end") continue;
    const v = n[k];
    if (v && typeof v === "object") varDecls(v, set);
  }
}
/** Names a piece of code reads from outside itself (`free`) and outside objects it writes into (`mut`). */
function analyze(root, asFunctionBody = false) {
  const free = new Set(),
    mut = new Set(),
    scopes = [];
  const declared = (name) => scopes.some((s) => s.has(name));
  const rootOf = (n) => {
    n = unwrap(n);
    while (
      n &&
      (n.type === "MemberExpression" ||
        n.type === "ChainExpression" ||
        n.type === "ParenthesizedExpression")
    )
      n = unwrap(n.type === "MemberExpression" ? n.object : n.expression);
    return n && n.type === "Identifier" ? n.name : null;
  };
  const touch = (n) => {
    const r = rootOf(n);
    if (r && !declared(r)) mut.add(r);
  };
  function patExprs(p) {
    if (!p) return;
    switch (p.type) {
      case "ObjectPattern":
        for (const pr of p.properties) {
          if (pr.type === "RestElement") patExprs(pr.argument);
          else {
            if (pr.computed) visit(pr.key);
            patExprs(pr.value);
          }
        }
        break;
      case "ArrayPattern":
        p.elements.forEach(patExprs);
        break;
      case "AssignmentPattern":
        patExprs(p.left);
        visit(p.right);
        break;
      case "RestElement":
        patExprs(p.argument);
        break;
    }
  }
  function patAssign(p) {
    if (!p) return;
    switch (p.type) {
      case "Identifier":
      case "MemberExpression":
        touch(p);
        visit(p);
        break;
      case "ObjectPattern":
        for (const pr of p.properties) {
          if (pr.type === "RestElement") patAssign(pr.argument);
          else {
            if (pr.computed) visit(pr.key);
            patAssign(pr.value);
          }
        }
        break;
      case "ArrayPattern":
        p.elements.forEach(patAssign);
        break;
      case "AssignmentPattern":
        patAssign(p.left);
        visit(p.right);
        break;
      case "RestElement":
        patAssign(p.argument);
        break;
      default:
        visit(p);
    }
  }
  function fn(n) {
    const s = new Set();
    if (n.type === "FunctionExpression" && n.id) s.add(n.id.name);
    for (const p of n.params) for (const x of patNames(p, [])) s.add(x);
    if (n.body.type === "BlockStatement") {
      blockDecls(n.body.body, s);
      varDecls(n.body.body, s);
    }
    if (n.type !== "ArrowFunctionExpression") s.add("arguments");
    scopes.push(s);
    n.params.forEach(patExprs);
    visit(n.body.type === "BlockStatement" ? n.body.body : n.body);
    scopes.pop();
  }
  const letNames = (decl, s) => {
    if (decl && decl.type === "VariableDeclaration" && decl.kind !== "var")
      for (const d of decl.declarations)
        for (const x of patNames(d.id, [])) s.add(x);
  };
  function visit(n) {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return void n.forEach(visit);
    if (typeof n.type !== "string") return;
    switch (n.type) {
      case "Identifier":
        if (!declared(n.name)) free.add(n.name);
        return;
      case "MemberExpression":
        visit(n.object);
        if (n.computed) visit(n.property);
        return;
      case "Property":
      case "MethodDefinition":
      case "PropertyDefinition":
      case "AccessorProperty":
        if (n.computed) visit(n.key);
        visit(n.value);
        return;
      case "LabeledStatement":
        return visit(n.body);
      case "BreakStatement":
      case "ContinueStatement":
      case "MetaProperty":
        return;
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        return fn(n);
      case "ClassDeclaration":
      case "ClassExpression": {
        const s = new Set();
        if (n.id) s.add(n.id.name);
        scopes.push(s);
        visit(n.superClass);
        visit(n.body.body);
        scopes.pop();
        return;
      }
      case "StaticBlock": {
        const s = new Set();
        blockDecls(n.body, s);
        varDecls(n.body, s);
        scopes.push(s);
        visit(n.body);
        scopes.pop();
        return;
      }
      case "BlockStatement": {
        const s = new Set();
        blockDecls(n.body, s);
        scopes.push(s);
        visit(n.body);
        scopes.pop();
        return;
      }
      case "ForStatement": {
        const s = new Set();
        letNames(n.init, s);
        scopes.push(s);
        visit(n.init);
        visit(n.test);
        visit(n.update);
        visit(n.body);
        scopes.pop();
        return;
      }
      case "ForInStatement":
      case "ForOfStatement": {
        const s = new Set();
        letNames(n.left, s);
        scopes.push(s);
        if (n.left.type === "VariableDeclaration") visit(n.left);
        else patAssign(n.left);
        // whatever is iterated is usually being filled in by the loop body
        touch(n.right);
        visit(n.right);
        visit(n.body);
        scopes.pop();
        return;
      }
      case "SwitchStatement": {
        visit(n.discriminant);
        const s = new Set();
        for (const c of n.cases) blockDecls(c.consequent, s);
        scopes.push(s);
        for (const c of n.cases) {
          visit(c.test);
          visit(c.consequent);
        }
        scopes.pop();
        return;
      }
      case "CatchClause": {
        const s = new Set();
        for (const x of patNames(n.param, [])) s.add(x);
        scopes.push(s);
        patExprs(n.param);
        visit(n.body);
        scopes.pop();
        return;
      }
      case "VariableDeclaration":
        for (const d of n.declarations) {
          patExprs(d.id);
          visit(d.init);
        }
        return;
      case "AssignmentExpression":
        patAssign(n.left);
        visit(n.right);
        return;
      case "UpdateExpression":
        touch(n.argument);
        visit(n.argument);
        return;
      case "UnaryExpression":
        if (n.operator === "delete") touch(n.argument);
        visit(n.argument);
        return;
      case "CallExpression": {
        const c = unwrap(n.callee);
        // a method call on something from outside may change it; so may the bundle's own
        // namespace helper and Object.assign / defineProperty on their first argument
        if (c.type === "MemberExpression") touch(c.object);
        if (
          n.arguments.length &&
          ((c.type === "Identifier" && c.name === HELPER) ||
            (c.type === "MemberExpression" &&
              rootOf(c) === "Object" &&
              !c.computed &&
              /^(assign|defineProperty|defineProperties|freeze)$/.test(
                c.property.name,
              )))
        )
          touch(n.arguments[0]);
        visit(n.callee);
        visit(n.arguments);
        return;
      }
    }
    for (const k in n) {
      if (k === "type" || k === "start" || k === "end") continue;
      const v = n[k];
      if (v && typeof v === "object") visit(v);
    }
  }
  if (asFunctionBody) fn(root);
  else visit(root);
  return { free, mut };
}

// ---------------------------------------------------------------- the bundle's top level
const units = []; // { kind: "decl" | "effect", names, node, src(), start, free, mut }
const owner = new Map(); // top-level name -> unit
for (const st of BODY) {
  if (st.type === "VariableDeclaration") {
    for (const d of st.declarations) {
      const names = patNames(d.id, []);
      const u = {
        kind: "decl",
        names,
        node: d,
        start: d.start,
        src: () => `${st.kind === "var" ? "var" : "let"} ${text(d)};`,
      };
      Object.assign(
        u,
        analyze({ type: "VariableDeclaration", declarations: [d] }),
      );
      units.push(u);
      for (const n of names) owner.set(n, u);
    }
  } else if (
    st.type === "FunctionDeclaration" ||
    st.type === "ClassDeclaration"
  ) {
    const u = {
      kind: "decl",
      names: [st.id.name],
      node: st,
      start: st.start,
      src: () => text(st),
    };
    Object.assign(u, analyze(st));
    units.push(u);
    owner.set(st.id.name, u);
  } else {
    const u = {
      kind: "effect",
      names: [],
      node: st,
      start: st.start,
      src: () => text(st),
    };
    Object.assign(u, analyze(st));
    const vs = new Set();
    varDecls(st, vs);
    for (const n of vs) {
      u.names.push(n);
      if (!owner.has(n)) owner.set(n, u);
    }
    units.push(u);
  }
}

// A top-level statement may fill a table by calling a function that does the writing
// (`fillColliders();`): count what the functions it uses change as changed by the statement.
const fnMut = new Map();
function mutOf(name, seen = new Set()) {
  if (fnMut.has(name)) return fnMut.get(name);
  const out = new Set();
  const u = owner.get(name);
  if (!u || u.kind !== "decl" || seen.has(name)) return out;
  const n = u.node.type === "VariableDeclarator" ? unwrap(u.node.init) : u.node;
  if (!n || !isFn(n)) return out;
  seen.add(name);
  for (const m of u.mut) out.add(m);
  for (const f of u.free) for (const m of mutOf(f, seen)) out.add(m);
  fnMut.set(name, out);
  return out;
}
// (kept apart from what the statement writes itself: the bundle's boot call reaches everything
// this way, so it only counts for statements sitting among the module's own declarations)
for (const u of units)
  if (u.kind === "effect") {
    u.callMut = new Set();
    for (const f of u.free) for (const m of mutOf(f)) u.callMut.add(m);
  }

// ---------------------------------------------------------------- follow references
const roots = [...hands.map].filter(([pub]) => !SKIP_EXPORTS.has(pub));
const need = new Set(roots.map(([, local]) => local));
const taken = new Set();
const usedThree = new Set();
const globals = new Set();
const skipUnits = new Set([owner.get(THREE_NS), owner.get(NAMESPACE)]);
for (const u of units)
  if (u.node === three.stmt || u.node === hands.stmt) skipUnits.add(u);
let grew = true;
const why = new Map();
const want = (name, by) => {
  if (!need.has(name)) {
    need.add(name);
    why.set(name, by);
    grew = true;
  }
};
const take = (u, by) => {
  if (taken.has(u) || skipUnits.has(u)) return;
  taken.add(u);
  grew = true;
  for (const f of u.free)
    want(f, u.names[0] || `statement at line ${lineOf(u.start)}`);
};
function follow(viaCalls) {
  grew = true;
  while (grew) {
    grew = false;
    for (const name of [...need]) {
      if (name === THREE_NS) continue;
      if (threeByLocal.has(name)) usedThree.add(name);
      else if (owner.has(name)) take(owner.get(name), name);
      else globals.add(name);
    }
    const have = new Set();
    let lo = Infinity,
      hi = -Infinity;
    for (const u of taken) {
      for (const n of u.names) have.add(n);
      if (u.kind === "decl")
        ((lo = Math.min(lo, u.start)), (hi = Math.max(hi, u.start)));
    }
    for (const u of units) {
      if (u.kind !== "effect" || taken.has(u) || skipUnits.has(u)) continue;
      const hit = [...u.mut].filter((m) => have.has(m));
      if (viaCalls && u.start > lo && u.start < hi)
        for (const m of u.callMut) if (have.has(m)) hit.push(m);
      if (hit.length) take(u, "fills " + [...new Set(hit)].join(","));
    }
  }
}
follow(false);
follow(true);

const list = [...taken].sort((a, b) => a.start - b.start);
const lines = list.reduce((n, u) => n + u.src().split("\n").length, 0);
const KNOWN_GLOBALS = new Set(
  "Math Float32Array Float64Array Uint8Array Uint16Array Uint32Array Int8Array Int16Array Int32Array Uint8ClampedArray Array Object Number String Boolean Symbol Map Set WeakMap WeakSet Promise Error TypeError RangeError JSON Date RegExp console performance undefined NaN Infinity isNaN isFinite parseInt parseFloat globalThis window document navigator location setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame ArrayBuffer DataView BigInt Reflect Proxy Intl URL URLSearchParams structuredClone queueMicrotask fetch Image ImageData OffscreenCanvas HTMLCanvasElement AudioContext TextDecoder TextEncoder Blob self crypto".split(
    " ",
  ),
);
const odd = [...globals].filter((g) => !KNOWN_GLOBALS.has(g));
console.log(
  `[extract-hands] ${list.length} pieces, ${lines} lines; ${usedThree.size} engine classes; lines ${lineOf(list[0].start)}-${lineOf(list[list.length - 1].start)} of game.js`,
);
if (odd.length)
  console.log(
    "[extract-hands] unresolved names:",
    odd.map((g) => `${g} (via ${why.get(g)})`).join(", "),
  );
if (REPORT) {
  // where the pieces come from, in 500-line buckets of the bundle
  const buckets = new Map();
  for (const u of list) {
    const b = Math.floor(lineOf(u.start) / 500) * 500;
    buckets.set(b, (buckets.get(b) || 0) + u.src().split("\n").length);
  }
  console.log([...buckets].map(([b, n]) => `${b}: ${n}`).join("  "));
  process.exit(0);
}

// ---------------------------------------------------------------- write the module
const threeBind = [...usedThree]
  .sort()
  .map((l) => `${threeByLocal.get(l)}: ${l}`);
let out = `// GENERATED by arsenal/scripts/extract-hands.mjs from src/game.js. Do not edit: change the
// game's hands there, then run the script again.
// The game's first-person arms (rig, skinned mesh, material, finger poses, grips, arm IK), with
// the names the bundle gave them. Engine classes are bound to the lab's own three.js.
import * as THREE from "three";
const ${THREE_NS} = THREE;
const {
  ${threeBind.join(",\n  ")},
} = THREE;
// the bundle's namespace helper
var ${HELPER} = (n, e) => {
  for (var t in e) Object.defineProperty(n, t, { get: e[t], enumerable: !0 });
};
`;
for (const u of list)
  if (!(u.names.length === 1 && u.names[0] === HELPER)) out += u.src() + "\n";
out += `\nexport {\n${roots.map(([pub, local]) => `  ${local} as ${pub},`).join("\n")}\n};\n`;
// formatted like the rest of the lab, so a re-run produces a small diff
out = await (await import("prettier")).format(out, { parser: "babel" });
fs.writeFileSync(OUT, out);
console.log(
  `[extract-hands] wrote ${OUT} (${(out.length / 1024).toFixed(0)} KB)`,
);
