import { t } from '../i18n/index.js';

/** Véu simples de pausa ("toque para continuar"). O menu de pausa completo vem depois. */
export class PauseVeil {
  constructor(onContinue) {
    this.el = document.createElement('div');
    this.el.className = 'pause-veil';
    this.el.hidden = true;
    this.el.addEventListener('pointerup', () => onContinue());
  }

  mount(parent) {
    parent.appendChild(this.el);
  }

  get visible() {
    return !this.el.hidden;
  }

  show() {
    this.el.textContent = t('pause.tapToContinue');
    this.el.hidden = false;
  }

  hide() {
    this.el.hidden = true;
  }
}
