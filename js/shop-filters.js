/*
 * Shop filtering, sorting and search.
 *
 * Every product is already in the page as a static <article class="product-card">
 * — this only hides, shows and reorders those existing elements. It never
 * fetches anything and never renders a card from scratch, so there's no
 * product data structure anywhere for this file to have an opinion about.
 *
 * Paging works the same way: the filtered, sorted set is sliced to one page and
 * everything else is hidden. Nothing is fetched. A catalogue big enough that
 * holding every card in the page becomes a problem wants a server rendering one
 * page at a time instead, and the markup here is the shape to render.
 *
 * Needs: reveal.js (only to re-run the reveal-on-scroll state after reordering)
 */
window.A1 = window.A1 || {};

(() => {
	const PRICE_CEILING = 1000;
	// Cards per page. Three columns at the widest breakpoint, so multiples of
	// three fill the last row.
	const PAGE_SIZE = 12;
	// Long enough that typing a word doesn't fire a re-filter per keystroke.
	const SEARCH_DEBOUNCE = 250;

	function pluralise(count, singularNoun, pluralNoun = `${singularNoun}s`) {
		return `${count} ${count === 1 ? singularNoun : pluralNoun}`;
	}

	const query = {
		category: '',
		concerns: [],
		term: '',
		maxPrice: PRICE_CEILING,
		inStockOnly: false,
		sort: 'featured',
		page: 1
	};

	const sorters = {
		featured: (first, second) =>
			Number(second.dataset.bestseller === 'true') - Number(first.dataset.bestseller === 'true') ||
			Number(second.dataset.rating) - Number(first.dataset.rating),
		'price-asc': (first, second) => Number(first.dataset.price) - Number(second.dataset.price),
		'price-desc': (first, second) => Number(second.dataset.price) - Number(first.dataset.price),
		rating: (first, second) => Number(second.dataset.rating) - Number(first.dataset.rating),
		newest: (first, second) =>
			Number(second.dataset.new === 'true') - Number(first.dataset.new === 'true') ||
			Number(second.dataset.rating) - Number(first.dataset.rating)
	};

	let grid;
	let cards = [];
	let resultCount;
	let emptyState;
	let filterPanel;
	let pager;
	let pagerPosition;
	let searchTimer;

	function cardMatches(card) {
		if (query.category && card.dataset.category !== query.category) return false;
		if (query.inStockOnly && Number(card.dataset.stock) <= 0) return false;
		if (query.maxPrice < PRICE_CEILING && Number(card.dataset.price) > query.maxPrice) return false;

		if (query.concerns.length) {
			const cardConcerns = card.dataset.concerns.split(' ');
			if (!query.concerns.some((concern) => cardConcerns.includes(concern))) return false;
		}

		if (query.term && !card.dataset.search.includes(query.term)) return false;

		return true;
	}

	function pageCount(total) {
		return Math.max(1, Math.ceil(total / PAGE_SIZE));
	}

	function refresh() {
		updateClearButton();

		const matched = cards.filter(cardMatches).sort(sorters[query.sort] || sorters.featured);

		// Clamp before anything reads it: a filter that shrinks the results can
		// otherwise leave us on a page that no longer exists.
		query.page = Math.min(Math.max(1, query.page), pageCount(matched.length));

		const start = (query.page - 1) * PAGE_SIZE;
		const onPage = matched.slice(start, start + PAGE_SIZE);

		updateQueryString();

		cards.forEach((card) => {
			card.parentElement.hidden = !onPage.includes(card);
		});

		// Move the wrappers rather than the cards, so the hidden ones end up
		// tucked at the end where they belong.
		onPage.forEach((card) => grid.appendChild(card.parentElement));

		resultCount.textContent = matched.length
			? `${start + 1}–${start + onPage.length} of ${pluralise(matched.length, 'product')}`
			: pluralise(0, 'product');

		emptyState.hidden = matched.length > 0;
		grid.hidden = matched.length === 0;
		renderPager(matched.length);
	}

	function renderPager(total) {
		if (!pager) return;

		const pages = pageCount(total);

		// Kept in step even while hidden, so the control never reappears showing
		// the page someone was on before the last filter.
		if (pagerPosition) pagerPosition.textContent = `Page ${query.page} of ${pages}`;

		// One page of results needs no controls at all.
		pager.hidden = pages <= 1;
		if (pager.hidden) return;

		const previous = pager.querySelector('[data-page-previous]');
		const next = pager.querySelector('[data-page-next]');
		if (previous) previous.disabled = query.page <= 1;
		if (next) next.disabled = query.page >= pages;
	}

	function goToPage(nextPage) {
		query.page = nextPage;
		refresh();

		// Land at the top of the results rather than wherever the button was.
		// Snapped, not smoothed: a page of cards has just been replaced, and
		// gliding past the old ones on the way up only delays seeing the new set.
		//
		// 'instant', not 'auto'. base.css sets scroll-behavior: smooth on the
		// root, and 'auto' means "whatever CSS says", which is exactly the glide
		// we are trying to avoid here.
		const top = document.querySelector('[data-results-top]') || grid;
		top?.scrollIntoView({ behavior: 'instant', block: 'start' });
	}

	function activeFilterCount() {
		return (
			(query.category ? 1 : 0) +
			query.concerns.length +
			(query.inStockOnly ? 1 : 0) +
			(query.maxPrice < PRICE_CEILING ? 1 : 0) +
			(query.term ? 1 : 0)
		);
	}

	function updateClearButton() {
		const count = activeFilterCount();

		document.querySelectorAll('[data-filter-clear]').forEach((button) => {
			button.hidden = count === 0;
		});

		const badge = document.querySelector('[data-filter-count]');
		if (badge) {
			badge.textContent = count;
			badge.hidden = count === 0;
		}
	}

	function updateQueryString() {
		const params = new URLSearchParams();
		if (query.category) params.set('category', query.category);
		if (query.concerns.length) params.set('concerns', query.concerns.join(','));
		if (query.term) params.set('q', query.term);
		if (query.sort !== 'featured') params.set('sort', query.sort);
		if (query.maxPrice < PRICE_CEILING) params.set('max', query.maxPrice);
		if (query.inStockOnly) params.set('stock', '1');
		if (query.page > 1) params.set('page', query.page);

		const search = params.toString();
		// replaceState, not pushState: the back button should leave the shop, not
		// step back through every facet someone touched.
		history.replaceState(null, '', search ? `?${search}` : location.pathname);
	}

	function readQueryString() {
		const params = new URLSearchParams(location.search);

		query.category = params.get('category') || '';
		query.concerns = (params.get('concerns') || '').split(',').filter(Boolean);
		query.term = (params.get('q') || '').toLowerCase();
		query.sort = params.get('sort') || 'featured';
		query.maxPrice = Number(params.get('max')) || PRICE_CEILING;
		query.inStockOnly = params.get('stock') === '1';
		query.page = Math.max(1, Number(params.get('page')) || 1);
	}

	// Pushes the state back onto the controls, so a shared link arrives with the
	// right buttons already pressed.
	function syncControls() {
		document.querySelectorAll('[data-filter-category]').forEach((button) => {
			button.setAttribute('aria-pressed', String(button.dataset.filterCategory === query.category));
		});

		document.querySelectorAll('[data-filter-concern]').forEach((button) => {
			button.setAttribute(
				'aria-pressed',
				String(query.concerns.includes(button.dataset.filterConcern))
			);
		});

		const searchInput = document.querySelector('[data-filter-search]');
		if (searchInput) searchInput.value = query.term;

		const sortSelect = document.querySelector('[data-filter-sort]');
		if (sortSelect) sortSelect.value = query.sort;

		const priceInput = document.querySelector('[data-filter-price]');
		if (priceInput) priceInput.value = query.maxPrice;
		renderPriceLabel();

		const stockInput = document.querySelector('[data-filter-stock]');
		if (stockInput) stockInput.checked = query.inStockOnly;

		// The masthead headline follows the chosen category. Only rewrite it when
		// the text actually changes — it carries the word-by-word reveal, and
		// replacing its text throws those spans away.
		const heading = document.querySelector('[data-filter-heading]');
		const activeCategory = document.querySelector(`[data-filter-category="${query.category}"]`);
		if (heading && activeCategory) {
			const nextTitle = activeCategory.dataset.categoryName;
			if (heading.textContent.trim() !== nextTitle) {
				heading.textContent = nextTitle;
				A1.reveal.words(heading);
			}
		}
	}

	function renderPriceLabel() {
		const label = document.querySelector('[data-filter-price-label]');
		if (!label) return;

		label.textContent = query.maxPrice >= PRICE_CEILING ? 'Any price' : `Up to $${query.maxPrice}`;
	}

	// Any change to the facets puts you back on page one. Staying on page 3 of a
	// result set that just shrank to one page is the classic paging bug.
	function refreshFromFilters() {
		query.page = 1;
		refresh();
	}

	function setUpControls() {
		document.querySelectorAll('[data-filter-category]').forEach((button) => {
			button.addEventListener('click', () => {
				const slug = button.dataset.filterCategory;
				// Clicking the category you're already in clears it.
				query.category = query.category === slug ? '' : slug;
				syncControls();
				refreshFromFilters();
			});
		});

		document.querySelectorAll('[data-filter-concern]').forEach((button) => {
			button.addEventListener('click', () => {
				const slug = button.dataset.filterConcern;
				query.concerns = query.concerns.includes(slug)
					? query.concerns.filter((existing) => existing !== slug)
					: [...query.concerns, slug];
				syncControls();
				refreshFromFilters();
			});
		});

		document.querySelector('[data-filter-search]')?.addEventListener('input', (event) => {
			query.term = event.target.value.trim().toLowerCase();
			clearTimeout(searchTimer);
			searchTimer = setTimeout(refresh, SEARCH_DEBOUNCE);
		});

		document.querySelector('[data-filter-sort]')?.addEventListener('change', (event) => {
			query.sort = event.target.value;
			refreshFromFilters();
		});

		document.querySelector('[data-filter-price]')?.addEventListener('input', (event) => {
			query.maxPrice = Number(event.target.value);
			renderPriceLabel();
			refreshFromFilters();
		});

		document.querySelector('[data-filter-stock]')?.addEventListener('change', (event) => {
			query.inStockOnly = event.target.checked;
			refreshFromFilters();
		});

		document.querySelectorAll('[data-filter-clear]').forEach((button) => {
			button.addEventListener('click', () => {
				query.category = '';
				query.concerns = [];
				query.term = '';
				query.maxPrice = PRICE_CEILING;
				query.inStockOnly = false;
				syncControls();
				refreshFromFilters();
			});
		});

		// On small screens the filter rail is collapsed until asked for.
		const panelToggle = document.querySelector('[data-filter-toggle]');
		pager?.querySelector('[data-page-previous]')?.addEventListener('click', () => goToPage(query.page - 1));
		pager?.querySelector('[data-page-next]')?.addEventListener('click', () => goToPage(query.page + 1));

		panelToggle?.addEventListener('click', () => {
			const isOpen = panelToggle.getAttribute('aria-expanded') === 'true';
			panelToggle.setAttribute('aria-expanded', String(!isOpen));
			filterPanel.toggleAttribute('data-open', !isOpen);
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		grid = document.querySelector('[data-product-grid]');
		if (!grid) return;

		cards = [...grid.querySelectorAll('[data-product]')];
		resultCount = document.querySelector('[data-result-count]');
		emptyState = document.querySelector('[data-empty-state]');
		filterPanel = document.querySelector('[data-filter-panel]');
		pager = document.querySelector('[data-pager]');
		pagerPosition = document.querySelector('[data-page-position]');

		readQueryString();
		setUpControls();
		syncControls();
		refresh();
	});
})();
