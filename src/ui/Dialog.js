import { t } from '../i18n/index.js';

let open = null;

/** Diálogo de confirmação no estilo do jogo (papel + lanterna). */
export const Dialog = {
  get isOpen() {
    return open !== null;
  },

  confirm(message) {
    Dialog.close(false);
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal paper" role="dialog" aria-modal="true">
          <p></p>
          <div class="actions">
            <button class="lantern-btn" data-answer="no"></button>
            <button class="lantern-btn primary" data-answer="yes"></button>
          </div>
        </div>`;
      backdrop.querySelector('p').textContent = message;
      backdrop.querySelector('[data-answer="no"]').textContent = t('common.no');
      backdrop.querySelector('[data-answer="yes"]').textContent = t('common.yes');
      backdrop.addEventListener('click', (e) => {
        const answer = e.target.closest('[data-answer]')?.dataset.answer;
        if (answer) Dialog.close(answer === 'yes');
        else if (e.target === backdrop) Dialog.close(false);
      });
      document.getElementById('ui').appendChild(backdrop);
      open = { backdrop, resolve };
    });
  },

  close(result = false) {
    if (!open) return;
    const { backdrop, resolve } = open;
    open = null;
    backdrop.remove();
    resolve(result);
  },
};
