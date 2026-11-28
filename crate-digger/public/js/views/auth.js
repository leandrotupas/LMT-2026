import { h, clear, field, input, btn } from '../ui.js';
import { post } from '../api.js';

export function renderAuth(root, hasUsers, onDone) {
  let mode = hasUsers ? 'login' : 'register';
  const draw = () => {
    const user = input({ autocomplete: 'username', required: true, minlength: 3, maxlength: 32, value: '' });
    const pass = input({ type: 'password', autocomplete: mode === 'login' ? 'current-password' : 'new-password', required: true, minlength: 8 });
    const err = h('p', { class: 'error-text', role: 'alert' });
    const submit = btn(mode === 'login' ? 'Sign in' : 'Create account', null, { cls: 'primary', type: 'submit' });
    const form = h('form', { class: 'card', onsubmit: async (e) => {
      e.preventDefault();
      err.textContent = '';
      submit.disabled = true;
      try {
        await post(mode === 'login' ? '/api/login' : '/api/register', { username: user.value, password: pass.value });
        await onDone();
      } catch (ex) { err.textContent = ex.message; submit.disabled = false; }
    } },
      h('div', { class: 'row' }, h('img', { src: '/favicon.svg', alt: '', width: 40, height: 40 }), h('div', null, h('h1', 'y2r Crate Digger'), h('p', { class: 'muted small' }, 'Find it. Follow it. Collect it. Play it.'))),
      h('p', { class: 'muted' }, mode === 'login' ? 'Sign in to your collection.' : 'Create an account. Your crates, tracks and tracklists are stored on this server, so they follow you to every device that uses it.'),
      field('Username', user, mode === 'register' ? '3–32 letters, numbers, dots, dashes or underscores.' : null),
      field('Password', pass, mode === 'register' ? 'At least 8 characters.' : null),
      err,
      submit,
      h('p', { class: 'small muted' }, mode === 'login' ? 'New here? ' : 'Already have an account? ',
        h('button', { type: 'button', class: 'btn ghost sm', onclick: () => { mode = mode === 'login' ? 'register' : 'login'; draw(); } }, mode === 'login' ? 'Create an account' : 'Sign in')));
    clear(root, h('main', { class: 'auth', id: 'main' }, form));
    user.focus();
  };
  draw();
}
