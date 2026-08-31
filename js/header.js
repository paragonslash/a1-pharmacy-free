/*
 * Header behaviour: the transparent/solid tone switch, and the two mega panels.
 *
 * Pages whose first section is a full-bleed dark hero put data-full-bleed on
 * <body>. On those the header starts transparent with light type and switches
 * to its solid white state once you scroll past the hero — or while a mega
 * panel is open, since the panel itself is white.
 */
window.A1 = window.A1 || {};

(() => {
	const SCROLL_OFFSET = 40;
	// A little grace so moving from the link down to the panel doesn't close it.
	const CLOSE_DELAY = 150;

	let header;
	let panels = [];
	let triggers = [];
	let closeTimer;
	let openPanelName = null;
	let sitsOverMedia = false;

	function updateTone() {
		const isTransparent = sitsOverMedia && window.scrollY <= SCROLL_OFFSET && !openPanelName;
		header.classList.toggle('site-header--over-media', isTransparent);
	}

	function openPanel(name) {
		clearTimeout(closeTimer);
		if (openPanelName === name) return;

		openPanelName = name;
		panels.forEach((panel) => panel.toggleAttribute('data-open', panel.dataset.megaPanel === name));
		triggers.forEach((trigger) => {
			trigger.setAttribute('aria-expanded', String(trigger.dataset.megaTrigger === name));
		});

		updateTone();
	}

	function closePanel() {
		clearTimeout(closeTimer);
		if (!openPanelName) return;

		openPanelName = null;
		panels.forEach((panel) => panel.removeAttribute('data-open'));
		triggers.forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));

		updateTone();
	}

	function closePanelSoon() {
		clearTimeout(closeTimer);
		closeTimer = setTimeout(closePanel, CLOSE_DELAY);
	}

	function setUpPanels() {
		panels = [...document.querySelectorAll('[data-mega-panel]')];
		triggers = [...document.querySelectorAll('[data-mega-trigger]')];

		triggers.forEach((trigger) => {
			const name = trigger.dataset.megaTrigger;
			trigger.addEventListener('mouseenter', () => openPanel(name));
			trigger.addEventListener('focus', () => openPanel(name));
		});

		panels.forEach((panel) => {
			panel.addEventListener('mouseenter', () => clearTimeout(closeTimer));
		});

		// Nav links without a panel of their own should dismiss whatever's open.
		document.querySelectorAll('[data-nav-plain]').forEach((link) => {
			link.addEventListener('mouseenter', closePanelSoon);
			link.addEventListener('focus', closePanel);
		});

		header.addEventListener('mouseleave', closePanelSoon);
		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape') closePanel();
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		header = document.querySelector('[data-site-header]');
		if (!header) return;

		sitsOverMedia = document.body.hasAttribute('data-full-bleed');

		setUpPanels();
		updateTone();

		if (sitsOverMedia) {
			window.addEventListener('scroll', updateTone, { passive: true });
		}
	});

	A1.header = { closeMegaPanel: () => closePanel() };
})();
