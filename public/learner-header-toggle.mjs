/**
 * Independent learner header toggle module.
 * This module does not inspect application globals or modify application data.
 * The host page must explicitly pass the header element and authenticated role.
 */
export function mountLearnerHeaderToggle({
  header,
  role,
  allowedRoles = ['teacher', 'student', 'parent'],
  buttonLabel = 'Thu gọn đầu trang',
} = {}) {
  if (!(header instanceof HTMLElement)) {
    throw new TypeError('mountLearnerHeaderToggle requires a header HTMLElement');
  }

  if (!allowedRoles.includes(String(role || '').toLowerCase())) {
    return () => {};
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'learner-header-toggle';
  button.setAttribute('aria-expanded', 'true');
  button.textContent = buttonLabel;

  const onClick = () => {
    const compact = header.classList.toggle('learner-header-compact');
    button.setAttribute('aria-expanded', String(!compact));
    button.textContent = compact ? 'Mở rộng đầu trang' : buttonLabel;
  };

  button.addEventListener('click', onClick);
  header.insertAdjacentElement('afterend', button);

  return () => {
    button.removeEventListener('click', onClick);
    button.remove();
    header.classList.remove('learner-header-compact');
  };
}
