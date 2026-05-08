/**
 * DOM helpers minimalistas.
 * Sin framework, pero más cómodo que innerHTML + addEventListener.
 */

/**
 * Crea elemento.
 *   el('button', { class: 'btn', onClick: () => ... }, 'Click me')
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') node.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset' && typeof v === 'object') {
      Object.assign(node.dataset, v);
    } else if (v === true) node.setAttribute(k, '');
    else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/**
 * Atajo: $(selector) o $(selector, container)
 */
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/**
 * Template tag para HTML seguro (escapa interpolaciones).
 *   html`<div>${userInput}</div>`
 */
export function html(strings, ...values) {
  return strings.reduce((acc, s, i) => {
    const v = values[i - 1];
    return acc + escape(v) + s;
  });
}

function escape(s) {
  if (s === null || s === undefined) return '';
  if (Array.isArray(s)) return s.map(escape).join('');
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Crea elemento desde HTML string. Usa con html`` para seguridad.
 */
export function fromHtml(htmlStr) {
  const t = document.createElement('template');
  t.innerHTML = htmlStr.trim();
  return t.content.firstChild;
}

/**
 * Limpia un contenedor.
 */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Debounce
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
