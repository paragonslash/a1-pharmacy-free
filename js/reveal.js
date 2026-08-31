/*
 * Scroll-driven motion. Three effects, all declared in the markup:
 *
 *   data-reveal-on-scroll   element settles into place as it comes into view.
 *                           Options: data-reveal-variant (up/down/left/right/
 *                           fade/scale/clip/rule), -delay, -duration, -stagger
 *                           (applied per child), -threshold.
 *
 *   data-reveal-words       headline rises into place a word at a time.
 *                           Options: data-reveal-stagger, -delay.
 *
 *   data-count-up           number counts up the first time it's seen.
 *                           Needs data-count-value; optional -suffix, -prefix,
 *                           -decimals, -duration.
 *
 * All of it is additive. The hidden state lives behind the .js-motion class
 * this file adds to <html>, so with JS off nothing is ever stuck invisible,
 * and prefers-reduced-motion jumps straight to the finished state.
 */
window.A1 = window.A1 || {};

(() => {
	const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const canObserve = () => 'IntersectionObserver' in window;

	function numberAttribute(element, name, fallback) {
		const value = Number(element.getAttribute(name));
		return element.getAttribute(name) === null || Number.isNaN(value) ? fallback : value;
	}

	// ── reveal on scroll ────────────────────────────────────────────────────

	function setUpReveal(element) {
		const variant = element.getAttribute('data-reveal-variant') || 'up';
		const delay = numberAttribute(element, 'data-reveal-delay', 0);
		const duration = numberAttribute(element, 'data-reveal-duration', 900);
		const threshold = numberAttribute(element, 'data-reveal-threshold', 0.15);
		const stagger = numberAttribute(element, 'data-reveal-stagger', 0);

		// With a stagger the children move one after another, otherwise the
		// element moves as a single block.
		const targets = stagger ? [...element.children] : [element];
		const settle = () => targets.forEach((target) => (target.dataset.reveal = `${variant} in`));

		if (reducedMotion() || !canObserve()) {
			settle();
			return;
		}

		targets.forEach((target, index) => {
			target.dataset.reveal = variant;
			target.style.setProperty('--reveal-delay', `${delay + stagger * index}ms`);
			target.style.setProperty('--reveal-duration', `${duration}ms`);
		});

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				settle();
				observer.disconnect();
			},
			{ threshold, rootMargin: '0px 0px -8% 0px' }
		);

		observer.observe(element);
	}

	// ── word-by-word headline ───────────────────────────────────────────────

	function setUpWordReveal(heading) {
		const words = heading.textContent.trim().split(/\s+/).filter(Boolean);
		if (words.length === 0) return;

		const stagger = numberAttribute(heading, 'data-reveal-stagger', 55);
		const delay = numberAttribute(heading, 'data-reveal-delay', 0);
		const threshold = numberAttribute(heading, 'data-reveal-threshold', 0.4);

		/*
		 * The masks go in a wrapper span *inside* the heading, never on the
		 * heading itself. `.reveal-words` is display:inline, and an inline box
		 * ignores vertical margins — putting it on an <h1> would silently drop
		 * that heading's margin-top.
		 */
		const wrapper = document.createElement('span');
		wrapper.className = 'reveal-words';

		words.forEach((word, index) => {
			const mask = document.createElement('span');
			mask.className = 'reveal-words__mask';

			const inner = document.createElement('span');
			inner.className = 'reveal-words__word';
			inner.style.setProperty('--word-delay', `${delay + index * stagger}ms`);
			inner.textContent = word;

			mask.appendChild(inner);
			wrapper.appendChild(mask);

			// A real space between masks, so the phrase still wraps and selects
			// normally and reads as ordinary prose to a screen reader.
			if (index < words.length - 1) wrapper.appendChild(document.createTextNode(' '));
		});

		heading.replaceChildren(wrapper);

		const reveal = () => wrapper.setAttribute('data-revealed', '');

		if (reducedMotion() || !canObserve()) {
			reveal();
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				reveal();
				observer.disconnect();
			},
			{ threshold }
		);

		observer.observe(heading);
	}

	// ── count up ────────────────────────────────────────────────────────────

	function setUpCountUp(element) {
		const finalValue = numberAttribute(element, 'data-count-value', 0);
		const duration = numberAttribute(element, 'data-count-duration', 1600);
		const decimals = numberAttribute(element, 'data-count-decimals', 0);
		const prefix = element.getAttribute('data-count-prefix') || '';
		const suffix = element.getAttribute('data-count-suffix') || '';

		const render = (value) => {
			element.textContent = prefix + value.toFixed(decimals) + suffix;
		};

		if (reducedMotion() || !canObserve()) {
			render(finalValue);
			return;
		}

		render(0);

		let startTime = 0;

		function step(timestamp) {
			if (!startTime) startTime = timestamp;

			const progress = Math.min(1, (timestamp - startTime) / duration);
			// Ease-out cubic: quick off the mark, settles at the end.
			render(finalValue * (1 - Math.pow(1 - progress, 3)));

			if (progress < 1) requestAnimationFrame(step);
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				requestAnimationFrame(step);
				observer.disconnect();
			},
			{ threshold: 0.6 }
		);

		observer.observe(element);
	}

	// Exported so scripts that inject markup later (the shop filters) can wire
	// up whatever they just added.
	function init(root = document) {
		root.querySelectorAll('[data-reveal-on-scroll]').forEach(setUpReveal);
		root.querySelectorAll('[data-reveal-words]').forEach(setUpWordReveal);
		root.querySelectorAll('[data-count-up]').forEach(setUpCountUp);
	}

	// Re-runs the word reveal on a single heading. Anything that rewrites a
	// headline's text has to call this afterwards, or it wipes out the spans
	// this file put there and the headline never animates.
	function words(heading) {
		setUpWordReveal(heading);
	}

	// Added before first paint, so there's no flash of already-placed content.
	document.documentElement.classList.add('js-motion');

	document.addEventListener('DOMContentLoaded', () => init());

	A1.reveal = { init, words };
})();
