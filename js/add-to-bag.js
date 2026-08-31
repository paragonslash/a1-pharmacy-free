/*
 * "Add to bag" — a demo hook, and the one script here you are meant to throw away.
 *
 * This template has no cart. Nothing is stored, no counter moves, no request is
 * made; the button simply confirms it was pressed, so the demo doesn't feel
 * broken to someone clicking around. That confirmation is the whole behaviour.
 *
 * When you wire in a real bag, delete this file and handle the click yourself.
 * Nothing else depends on it: the buttons stay valid markup with it gone, and
 * `A1.toasts.show()` is available to your own code the same way it is here.
 *
 * The name shown in the toast is read out of the page, not passed in — from the
 * product card the button sits in, or the page heading on a product page — so
 * there is no product data to keep in sync with anything.
 */
window.A1 = window.A1 || {};

(() => {
	// Where to look for the name, nearest enclosing block first. Add a pair here
	// if you introduce another kind of block with a buy button in it.
	const NAME_SOURCES = [
		['.product-card', '.product-card__name'],
		['.hero-slide', '.hero-slide__title'],
	];

	function productNameFor(button) {
		for (const [block, title] of NAME_SOURCES) {
			const scope = button.closest(block);
			const heading = scope && scope.querySelector(title);
			if (heading) return heading.textContent.trim();
		}

		// A product page has one product, named by its heading.
		const pageHeading = document.querySelector('main h1');
		return pageHeading ? pageHeading.textContent.trim() : '';
	}

	document.addEventListener('click', (event) => {
		const button = event.target.closest('[data-add-to-bag]');
		if (!button) return;

		// Toasts are optional — if toasts.js isn't on the page, do nothing at
		// all rather than throw.
		if (!window.A1.toasts) return;

		const name = productNameFor(button);
		window.A1.toasts.show('Added to bag', { detail: name, tone: 'success' });
	});
})();
