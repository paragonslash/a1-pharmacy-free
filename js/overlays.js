/*
 * The mobile menu and the search overlay.
 *
 * Both ship in the page with the `hidden` attribute set, so they still exist
 * with JavaScript off. This file just shows and hides them, and handles the
 * bits they have in common: only one open at a time, the page behind locked
 * against scrolling, focus trapped inside and handed back on close, and Escape
 * or a click on the scrim to dismiss.
 *
 * Needs: header.js
 */
window.A1 = window.A1 || {};

(() => {
	const FOCUSABLE =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	let openOverlay = null;
	let triggerToRefocus = null;

	function lockScroll(shouldLock) {
		if (shouldLock) {
			// Pad by the scrollbar width so the layout doesn't jump sideways.
			const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
			document.body.style.overflow = 'hidden';
			document.body.style.paddingRight = `${scrollbarWidth}px`;
		} else {
			document.body.style.overflow = '';
			document.body.style.paddingRight = '';
		}
	}

	function focusableInside(panel) {
		return [...panel.querySelectorAll(FOCUSABLE)].filter(
			(element) => element.offsetParent !== null || element === document.activeElement
		);
	}

	function onKeydown(event) {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return;
		}

		if (event.key !== 'Tab' || !openOverlay) return;

		const panel = openOverlay.querySelector('[data-overlay-panel]');
		const focusable = focusableInside(panel);
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function open(name, trigger) {
		const overlay = document.querySelector(`[data-overlay="${name}"]`);
		if (!overlay) return;

		if (openOverlay) close();
		A1.header?.closeMegaPanel();

		triggerToRefocus = trigger || null;
		openOverlay = overlay;
		overlay.hidden = false;
		lockScroll(true);

		document.querySelectorAll(`[data-overlay-open="${name}"]`).forEach((button) => {
			button.setAttribute('aria-expanded', 'true');
		});

		document.addEventListener('keydown', onKeydown);

		// Wait a frame so the drop-in animation has started before focus moves,
		// otherwise the browser scrolls the panel to the focused element.
		requestAnimationFrame(() => {
			const panel = overlay.querySelector('[data-overlay-panel]');
			const target = panel.querySelector('[data-overlay-autofocus]') || focusableInside(panel)[0];
			target?.focus();
		});

		overlay.dispatchEvent(new CustomEvent('overlay:open', { bubbles: true }));
	}

	function close() {
		if (!openOverlay) return;

		const overlay = openOverlay;
		const name = overlay.dataset.overlay;

		openOverlay = null;
		overlay.hidden = true;
		lockScroll(false);
		document.removeEventListener('keydown', onKeydown);

		document.querySelectorAll(`[data-overlay-open="${name}"]`).forEach((button) => {
			button.setAttribute('aria-expanded', 'false');
		});

		if (triggerToRefocus?.isConnected) triggerToRefocus.focus();
		triggerToRefocus = null;

		overlay.dispatchEvent(new CustomEvent('overlay:close', { bubbles: true }));
	}

	const isOpen = (name) => openOverlay?.dataset.overlay === name;

	document.addEventListener('DOMContentLoaded', () => {
		document.addEventListener('click', (event) => {
			const opener = event.target.closest('[data-overlay-open]');
			if (opener) {
				event.preventDefault();
				const name = opener.dataset.overlayOpen;
				// The menu button toggles; the search button only opens.
				if (isOpen(name)) close();
				else open(name, opener);
				return;
			}

			if (event.target.closest('[data-overlay-close]')) {
				event.preventDefault();
				close();
			}
		});
	});

	A1.overlays = { open, close, isOpen };
})();
