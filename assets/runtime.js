// Minimal runtime that mounts the page template (holes {{x}}, sc-for, sc-if, events, refs) and re-renders on setState.
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(o) { Object.assign(this.state, typeof o === 'function' ? o(this.state) : o); if (!this.__q) { this.__q = true; Promise.resolve().then(() => { this.__q = false; window.__rerender(); }); } }
}
(function () {
  const HOLE = /\{\{\s*([\w.$]+)\s*\}\}/g;
  const WHOLE = /^\{\{\s*([\w.$]+)\s*\}\}$/;
  const EV = { onclick: 'click', onchange: 'input', onsubmit: 'submit', oninput: 'input' };
  function res(vals, scope, path) {
    const ps = path.split('.'); let v = (ps[0] in scope) ? scope[ps[0]] : vals[ps[0]];
    for (let i = 1; i < ps.length; i++) v = v == null ? v : v[ps[i]];
    return v;
  }
  function interp(str, vals, scope) { return str.replace(HOLE, (m, p) => { const v = res(vals, scope, p); return v == null ? '' : String(v); }); }
  const refs = [];
  function build(node, vals, scope, comp, out) {
    if (node.nodeType === 3) { out.push(document.createTextNode(interp(node.nodeValue, vals, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-for') {
      const m = node.getAttribute('list').match(WHOLE); const list = m ? res(vals, scope, m[1]) || [] : [];
      const as = node.getAttribute('as');
      list.forEach((it) => { const sc = Object.assign({}, scope, { [as]: it }); node.childNodes.forEach((c) => build(c, vals, sc, comp, out)); });
      return;
    }
    if (tag === 'sc-if') {
      const m = node.getAttribute('value').match(WHOLE); if (m && res(vals, scope, m[1])) node.childNodes.forEach((c) => build(c, vals, scope, comp, out));
      return;
    }
    const el = node.cloneNode(false);
    for (const a of Array.from(node.attributes)) {
      const m = a.value.match(WHOLE);
      if (m && /^on[a-z]+$/.test(a.name)) {
        el.removeAttribute(a.name);
        const evn = EV[a.name] || a.name.slice(2).toLowerCase();
        const path = m[1], sc = scope;
        el.addEventListener(evn, (e) => { const fn = res(comp.__vals, sc, path); if (fn) fn(e); });
      } else if (a.name === 'ref' && m) {
        el.removeAttribute('ref'); refs.push([res(vals, scope, m[1]), el]);
      } else if (a.value.indexOf('{{') >= 0) {
        el.setAttribute(a.name, interp(a.value, vals, scope));
        if (a.name === 'value') el.value = el.getAttribute('value');
      }
    }
    el.__tpl = {}; for (const a of Array.from(el.attributes)) el.__tpl[a.name] = a.value;
    const kids = []; node.childNodes.forEach((c) => build(c, vals, scope, comp, kids));
    kids.forEach((k) => el.appendChild(k));
    out.push(el);
  }
  function patch(a, b) {
    if (a.nodeType === 3) { if (a.__t === undefined) a.__t = a.nodeValue; if (b.nodeValue !== a.__t) { a.nodeValue = b.nodeValue; a.__t = b.nodeValue; } return; }
    if (a.nodeType !== 1) return;
    for (const n in b.__tpl) if (a.__tpl[n] !== b.__tpl[n]) { a.setAttribute(n, b.__tpl[n]); a.__tpl[n] = b.__tpl[n]; if (n === 'value' && a.value !== b.__tpl[n]) a.value = b.__tpl[n]; }
    const ac = a.childNodes, bc = b.childNodes;
    for (let i = 0; i < Math.min(ac.length, bc.length); i++) patch(ac[i], bc[i]);
  }
  window.__mount = function (tpl, root, Comp) {
    const comp = new Comp({});
    const render = () => { comp.__vals = comp.renderVals(); const out = []; refs.length = 0; tpl.content.childNodes.forEach((c) => build(c, comp.__vals, {}, comp, out)); return out; };
    const nodes = render(); nodes.forEach((n) => root.appendChild(n));
    refs.forEach(([fn, el]) => fn && fn(el));
    window.__rerender = () => { const nn = render(); const rc = root.childNodes; for (let i = 0; i < Math.min(rc.length, nn.length); i++) patch(rc[i], nn[i]); };
    comp.componentDidMount && comp.componentDidMount();
    window.__comp = comp;
  };
})();
