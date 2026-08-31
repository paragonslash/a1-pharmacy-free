/*
 * Generic list paging.
 *
 * Put data-pager-list="name" and data-page-size="n" on any list, and a matching
 * data-pager="name" block anywhere on the page:
 *
 *   <ul data-pager-list="journal" data-page-size="3"> … </ul>
 *
 *   <nav class="pager" data-pager="journal" aria-label="Article pages" hidden>
 *     <button type="button" class="pager__step" data-page-previous>Previous</button>
 *     <p class="pager__position" data-page-position aria-live="polite"></p>
 *     <button type="button" class="pager__step" data-page-next>Next</button>
 *   </nav>
 *
 * It hides and shows the children already in the markup. Nothing is fetched and
 * nothing is rendered from data, so it has no opinion about what the list holds.
 *
 * The shop does its own paging in shop-filters.js rather than using this,
 * because there the page has to be recalculated every time a filter changes.
 * This file is for plain lists that only ever page.
 */
window.A1 = window.A1 || {};

(() => {
	function setUpPager(list) {
		const name = list.dataset.pagerList;
		const pager = document.querySelector(`[data-pager="${name}"]`);
		const size = Number(list.dataset.pageSize) || 12;
		const items = [...list.children];
		if (!pager || !items.length) return;

		const position = pager.querySelector('[data-page-position]');
		const previous = pager.querySelector('[data-page-previous]');
		const next = pager.querySelector('[data-page-next]');
		const pages = Math.max(1, Math.ceil(items.length / size));

		let current = 1;

		function render(moveFocus = false) {
			const start = (current - 1) * size;

			items.forEach((item, index) => {
				item.hidden = index < start || index >= start + size;
			});

			if (position) position.textContent = `Page ${current} of ${pages}`;
			if (previous) previous.disabled = current === 1;
			if (next) next.disabled = current === pages;

			if (moveFocus) {
				// Snapped rather than smoothed: the list has just been replaced, and
				// gliding back up only delays seeing the new items. 'instant' and not
				// 'auto' because base.css sets scroll-behavior: smooth on the root.
				list.scrollIntoView({ behavior: 'instant', block: 'start' });
			}
		}

		function go(page) {
			current = Math.min(Math.max(1, page), pages);
			render(true);
		}

		previous?.addEventListener('click', () => go(current - 1));
		next?.addEventListener('click', () => go(current + 1));

		// A single page needs no controls, but the list still has to be shown.
		pager.hidden = pages <= 1;
		render();
	}

	document.addEventListener('DOMContentLoaded', () => {
		document.querySelectorAll('[data-pager-list]').forEach(setUpPager);
	});
})();
