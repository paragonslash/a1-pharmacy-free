/*
 * Toasts — a small notification that appears, then dismisses itself.
 *
 * Nothing in this file assumes why you're showing one. Call it from your own
 * code wherever something happens that's worth a moment's confirmation:
 *
 *   A1.toasts.show('Saved', { detail: 'Your changes were saved.', tone: 'success' });
 *
 * The markup is built here with plain DOM calls, not cloned from a <template>,
 * so there's nothing to keep in sync between this file and the page.
 */
window.A1 = window.A1 || {};

(() => {
	const VISIBLE_DURATION = 4000;
	const LEAVE_DURATION = 200;

	const CHECK_PATH = 'M4 10.5l4 4 8-9';
	const DOT_PATH = 'M10 6v5M10 14v.5';

	function icon(path, strokeWidth) {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', '0 0 20 20');
		svg.setAttribute('fill', 'none');
		svg.setAttribute('stroke', 'currentColor');
		svg.setAttribute('stroke-width', strokeWidth);
		svg.setAttribute('aria-hidden', 'true');

		const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		p.setAttribute('d', path);
		p.setAttribute('stroke-linecap', 'round');
		p.setAttribute('stroke-linejoin', 'round');
		svg.appendChild(p);
		return svg;
	}

	function showToast(message, { detail = '', tone = 'default', duration = VISIBLE_DURATION } = {}) {
		const region = document.querySelector('[data-toast-region]');
		if (!region) return null;

		const isSuccess = tone === 'success';

		const toast = document.createElement('div');
		toast.className = `toast toast--${isSuccess ? 'success' : 'default'}`;

		const iconWrap = document.createElement('span');
		iconWrap.className = 'toast__icon';
		iconWrap.setAttribute('aria-hidden', 'true');
		iconWrap.appendChild(isSuccess ? icon(CHECK_PATH, '2.5') : icon(DOT_PATH, '2'));
		toast.appendChild(iconWrap);

		const text = document.createElement('div');
		text.className = 'toast__text';

		const messageEl = document.createElement('p');
		messageEl.className = 'toast__message';
		messageEl.textContent = message;
		text.appendChild(messageEl);

		if (detail) {
			const detailEl = document.createElement('p');
			detailEl.className = 'toast__detail';
			detailEl.textContent = detail;
			text.appendChild(detailEl);
		}

		toast.appendChild(text);

		const dismiss = document.createElement('button');
		dismiss.type = 'button';
		dismiss.className = 'toast__dismiss';
		dismiss.setAttribute('aria-label', 'Dismiss notification');
		dismiss.appendChild(icon('M6 6l8 8M14 6l-8 8', '1.6'));
		dismiss.addEventListener('click', () => dismissToast(toast));
		toast.appendChild(dismiss);

		region.appendChild(toast);
		setTimeout(() => dismissToast(toast), duration);

		return toast;
	}

	// Safe to call twice — the timeout and the dismiss button often race.
	function dismissToast(toast) {
		if (!toast || !toast.isConnected) return;
		if (toast.classList.contains('toast--leaving')) return;

		toast.classList.add('toast--leaving');
		setTimeout(() => toast.remove(), LEAVE_DURATION);
	}

	A1.toasts = { show: showToast, dismiss: dismissToast };
})();
