// Feedback modal client. New, independent of the stars module. Opens from any
// [data-fb-open] trigger (rail card in Mode A, empty-state affordance in Mode B).
// POSTs to the feedback endpoint; quiet success, in-modal error. astro:page-load
// safe; per-element bind guards + a single global keydown listener prevent any
// listener accumulation across in-site navigations. The submitting state lives
// on the modal's dataset so the global Escape handler can respect it.

const ENDPOINT = 'https://stars.copilotscope.ai/feedback';
const MIN = 10;
const MAX = 4000;

type Bound = { __fbBound?: boolean };

function initFeedback(): void {
  const modal = document.querySelector<HTMLElement>('[data-fb-modal]');
  if (!modal) return;
  const backdrop = modal.querySelector<HTMLElement>('[data-fb-backdrop]');
  const category = modal.querySelector<HTMLSelectElement>('[data-fb-category]');
  const message = modal.querySelector<HTMLTextAreaElement>('[data-fb-message]');
  const counter = modal.querySelector<HTMLElement>('[data-fb-counter]');
  const errorEl = modal.querySelector<HTMLElement>('[data-fb-error]');
  const submitBtn = modal.querySelector<HTMLButtonElement>('[data-fb-submit]');
  const cancelEls = Array.from(modal.querySelectorAll<HTMLElement>('[data-fb-cancel]'));
  const openers = Array.from(document.querySelectorAll<HTMLElement>('[data-fb-open]'));
  if (!category || !message || !counter || !errorEl || !submitBtn) return;

  const lens = document.querySelector('.lens-detail')?.getAttribute('data-lens') || '';
  let lastOpener: HTMLElement | null = null;
  const isSubmitting = () => modal.dataset.fbSubmitting === 'true';

  const updateCounter = (): void => {
    const n = message.value.length;
    counter.textContent = n + ' / ' + MAX;
    counter.classList.toggle('fb-counter--bad', n > 0 && (n < MIN || n > MAX));
    submitBtn.disabled = isSubmitting() || n < MIN || n > MAX;
  };

  const open = (opener: HTMLElement): void => {
    lastOpener = opener;
    errorEl.textContent = '';
    errorEl.hidden = true;
    modal.hidden = false;
    document.body.classList.add('fb-open');
    updateCounter();
    window.setTimeout(() => message.focus(), 0);
  };

  const close = (): void => {
    if (isSubmitting()) return;
    modal.hidden = true;
    document.body.classList.remove('fb-open');
    if (lastOpener) lastOpener.focus();
  };

  const showStatus = (opener: HTMLElement | null): void => {
    const status =
      (opener && opener.parentElement && opener.parentElement.querySelector<HTMLElement>('[data-fb-status]')) ||
      document.querySelector<HTMLElement>('[data-fb-status]');
    if (status) {
      status.textContent = 'Thanks \u2014 your feedback was submitted.';
      status.hidden = false;
      window.setTimeout(() => {
        status.hidden = true;
        status.textContent = '';
      }, 6000);
    }
  };

  const setBusy = (busy: boolean): void => {
    modal.dataset.fbSubmitting = busy ? 'true' : 'false';
    message.disabled = busy;
    category.disabled = busy;
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? 'Sending\u2026' : 'Send feedback';
  };

  const submit = async (): Promise<void> => {
    const msg = message.value;
    if (msg.length < MIN || msg.length > MAX) {
      errorEl.textContent = 'Please enter between ' + MIN + ' and ' + MAX + ' characters.';
      errorEl.hidden = false;
      return;
    }
    setBusy(true);
    errorEl.hidden = true;
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: msg, category: category.value, page: location.pathname, lens }),
      });
      let data: { ok?: boolean; error?: string } | null = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
      if (res.ok && data && data.ok) {
        const opener = lastOpener;
        setBusy(false);
        message.value = '';
        category.value = 'other';
        modal.hidden = true;
        document.body.classList.remove('fb-open');
        showStatus(opener);
      } else {
        errorEl.textContent = (data && data.error) || 'Something went wrong sending your feedback. Please try again.';
        errorEl.hidden = false;
        setBusy(false);
        updateCounter();
      }
    } catch (e) {
      errorEl.textContent = 'Could not reach the feedback service. Please try again.';
      errorEl.hidden = false;
      setBusy(false);
      updateCounter();
    }
  };

  for (const o of openers) {
    const b = o as HTMLElement & Bound;
    if (!b.__fbBound) {
      b.__fbBound = true;
      o.addEventListener('click', () => open(o));
    }
  }
  const m = message as HTMLTextAreaElement & Bound;
  if (!m.__fbBound) {
    m.__fbBound = true;
    message.addEventListener('input', updateCounter);
  }
  const sb = submitBtn as HTMLButtonElement & Bound;
  if (!sb.__fbBound) {
    sb.__fbBound = true;
    submitBtn.addEventListener('click', submit);
  }
  for (const cel of cancelEls) {
    const cb = cel as HTMLElement & Bound;
    if (!cb.__fbBound) {
      cb.__fbBound = true;
      cel.addEventListener('click', close);
    }
  }
  if (backdrop) {
    const bd = backdrop as HTMLElement & Bound;
    if (!bd.__fbBound) {
      bd.__fbBound = true;
      backdrop.addEventListener('click', close);
    }
  }
}

declare global {
  interface Window {
    __csFeedbackBound?: boolean;
  }
}
if (!window.__csFeedbackBound) {
  window.__csFeedbackBound = true;
  document.addEventListener('astro:page-load', initFeedback);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = document.querySelector<HTMLElement>('[data-fb-modal]');
    if (!modal || modal.hidden) return;
    if (modal.dataset.fbSubmitting === 'true') return;
    const cancel = modal.querySelector<HTMLElement>('[data-fb-cancel]');
    if (cancel) cancel.click();
  });
}

export {};
