/**
 * Standalone math-formula toolbar for a textarea-based answer editor.
 * The host page supplies the textarea explicitly; this module does not
 * inspect application globals, selectors, or application data.
 */

const DEFAULT_FORMULAS = [
  { label: 'Phân số', value: '\\frac{a}{b}' },
  { label: 'Lũy thừa', value: 'x^{n}' },
  { label: 'Căn bậc hai', value: '\\sqrt{x}' },
  { label: 'Căn bậc n', value: '\\sqrt[n]{x}' },
  { label: 'Hệ', value: '\\begin{cases} a \\\\ b \\end{cases}' },
  { label: 'Tổng', value: '\\sum_{i=1}^{n} a_i' },
  { label: 'Tích phân', value: '\\int_a^b f(x)\\,dx' },
  { label: 'Giới hạn', value: '\\lim_{x\\to a} f(x)' },
  { label: 'Pi', value: '\\pi' },
  { label: 'Delta', value: '\\Delta' },
];

/**
 * Mounts a small formula toolbar immediately before the supplied textarea.
 * Formula text is inserted at the current caret and an input event is emitted
 * so existing host-page listeners can update previews or save drafts.
 *
 * @returns {() => void} cleanup function
 */
export function mountMathFormulaToolbar({
  textarea,
  formulas = DEFAULT_FORMULAS,
  label = 'Chèn công thức toán',
  wrapInMathDelimiters = false,
} = {}) {
  if (!textarea || textarea.tagName !== 'TEXTAREA') {
    throw new TypeError('mountMathFormulaToolbar requires a textarea element');
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'math-formula-toolbar';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', label);

  const title = document.createElement('span');
  title.className = 'math-formula-toolbar__title';
  title.textContent = label;
  toolbar.append(title);

  const buttons = [];
  for (const formula of formulas) {
    if (!formula || typeof formula.value !== 'string') continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'math-formula-toolbar__button';
    button.textContent = formula.label || 'Công thức';
    button.title = formula.label || formula.value;
    button.addEventListener('click', () => {
      const insertion = wrapInMathDelimiters
        ? `\\( ${formula.value} \\\\)`
        : formula.value;
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? start;
      textarea.setRangeText(insertion, start, end, 'end');
      textarea.focus();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    buttons.push(button);
    toolbar.append(button);
  }

  textarea.insertAdjacentElement('beforebegin', toolbar);

  return () => {
    for (const button of buttons) button.replaceWith(button.cloneNode(true));
    toolbar.remove();
  };
}
