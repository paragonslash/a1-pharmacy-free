/*
 * Hero carousel.
 *
 * All the slides are already in the page — this just moves the data-active
 * marker between them and keeps the rest in step: thumbnail rail, counter,
 * the big catalogue number, the colour bloom and the live region.
 *
 * On a change the incoming packshot is rebuilt from vertical strips dropping in
 * from alternating edges (see .hero-plate__slices in css/pages/hero.css). The
 * strips are built here, animated by CSS, and removed once they land, so the
 * markup is back to a single image between transitions. Change SLICE_COUNT to
 * taste — nothing else needs to know about it.
 *
 * Autoplay pauses on hover, while focus is inside, and while the tab is
 * hidden, and never starts under prefers-reduced-motion.
 *
 * Include on pages with [data-hero-carousel]:
 *   <script src="js/slider.js" defer></script>
 */
window.A1 = window.A1 || {};

(() => {
	const SWIPE_THRESHOLD = 60;

	// Vertical strips the packshot is rebuilt from as it changes.
	const SLICE_COUNT = 7;
	const SLICE_DURATION = 780;
	const SLICE_STAGGER = 60;
	// Longest stagger plus the strip's own duration, and a little air.
	const SLICE_SETTLE = SLICE_DURATION + (SLICE_COUNT - 1) * SLICE_STAGGER + 40;

	function setUpCarousel(carousel) {
		const slides = [...carousel.querySelectorAll('[data-hero-slide]')];
		if (slides.length < 2) return;

		const thumbnails = [...carousel.querySelectorAll('[data-hero-thumbnail]')];
		const blooms = [...carousel.querySelectorAll('[data-hero-bloom]')];
		const rail = carousel.querySelector('.hero-rail');
		const positionLabel = carousel.querySelector('[data-hero-position]');
		const catalogueNumber = carousel.querySelector('[data-hero-catalogue-number]');
		const announcement = carousel.querySelector('[data-hero-announcement]');
		const pauseButton = carousel.querySelector('[data-hero-pause]');
		const pauseIcon = carousel.querySelector('[data-hero-icon-pause]');
		const playIcon = carousel.querySelector('[data-hero-icon-play]');

		const interval = Number(carousel.dataset.interval) || 7000;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

		let currentIndex = 0;
		let advanceTimer;
		let sliceTimer;
		let pausedByUser = false;
		// Hover, focus inside, or a hidden tab.
		let suspended = false;
		let pointerStartX = 0;
		let dragging = false;

		carousel.style.setProperty('--hero-interval', `${interval}ms`);

		const canAutoplay = () => !reducedMotion.matches && !pausedByUser && !suspended;

		function render() {
			slides.forEach((slide, index) => {
				const isCurrent = index === currentIndex;
				slide.toggleAttribute('data-active', isCurrent);
				// Keep the hidden slides out of the accessibility tree, or a screen
				// reader walks through six product headings in a row.
				if (isCurrent) slide.removeAttribute('aria-hidden');
				else slide.setAttribute('aria-hidden', 'true');
			});

			blooms.forEach((bloom, index) => bloom.toggleAttribute('data-active', index === currentIndex));

			thumbnails.forEach((thumbnail, index) => {
				if (index === currentIndex) thumbnail.setAttribute('aria-current', 'true');
				else thumbnail.removeAttribute('aria-current');
			});

			if (positionLabel) positionLabel.textContent = String(currentIndex + 1).padStart(2, '0');

			const itemNumber = slides[currentIndex].querySelector('.hero-plate__tag-text');
			if (catalogueNumber && itemNumber) {
				catalogueNumber.textContent = itemNumber.textContent.replace('No. ', '');
			}

			// The slide's own label already reads "2 of 6: Ibuprofen 200mg Tablets".
			if (announcement) {
				announcement.textContent = `Showing ${slides[currentIndex].getAttribute('aria-label')}`;
			}
		}

		/*
		 * Rebuild the incoming packshot from vertical strips.
		 *
		 * Each strip carries the whole image, scaled so one column shows through
		 * and offset to its own slot, so together they reassemble the picture.
		 * Odd and even strips arrive from opposite edges. The overlay is thrown
		 * away once they have landed, leaving the plain <img> underneath.
		 */
		function sliceIn(slide) {
			// Under reduced motion the image should simply be there.
			if (reducedMotion.matches) return;

			const plate = slide.querySelector('.hero-plate__image');
			const image = plate?.querySelector('img');
			if (!plate || !image) return;

			// A strip cannot paint an image the browser hasn't decoded yet. That
			// is what warmImages() below is for; if one still isn't ready, fall
			// through to the plain crossfade rather than animating empty strips.
			const source = image.currentSrc || image.getAttribute('src');
			if (!source || !image.complete) return;

			// Every slide has its own plate, so a change part-way through an
			// earlier transition would strand that slide's overlay: the shared
			// timer is about to be replaced, and nothing else would ever clear
			// it. Sweep the whole carousel rather than just this one plate.
			clearTimeout(sliceTimer);
			carousel.querySelectorAll('.hero-plate__slices').forEach((stale) => stale.remove());

			const overlay = document.createElement('div');
			overlay.className = 'hero-plate__slices';
			overlay.setAttribute('aria-hidden', 'true');
			overlay.style.setProperty('--slice-count', String(SLICE_COUNT));

			for (let index = 0; index < SLICE_COUNT; index += 1) {
				const strip = document.createElement('span');
				strip.className = 'hero-plate__slice';
				strip.style.setProperty('--slice-image', `url("${source}")`);
				strip.style.setProperty('--slice-position', `${(index / (SLICE_COUNT - 1)) * 100}%`);
				strip.style.setProperty('--slice-from', index % 2 === 0 ? '-101%' : '101%');
				strip.style.setProperty('--slice-delay', `${index * SLICE_STAGGER}ms`);
				overlay.appendChild(strip);
			}

			plate.appendChild(overlay);
			sliceTimer = setTimeout(() => overlay.remove(), SLICE_SETTLE);
		}

		/*
		 * Every slide but the first is lazy, and inactive slides are hidden — so
		 * the browser never fetches them and there is nothing for the strips to
		 * paint on the first pass through the carousel. Ask for them once the
		 * page itself has finished loading, which keeps them off the critical
		 * path while still having them ready long before the first change.
		 */
		function warmImages() {
			slides.forEach((slide) => {
				const image = slide.querySelector('.hero-plate__image img');
				if (image && !image.complete) image.loading = 'eager';
			});
		}

		// Replacing the node is the only reliable way to replay a CSS animation.
		function restartProgressBar() {
			const progress = thumbnails[currentIndex]?.querySelector('.hero-rail__progress');
			progress?.replaceWith(progress.cloneNode(true));
		}

		function queueNextSlide() {
			clearTimeout(advanceTimer);
			if (!canAutoplay()) return;
			advanceTimer = setTimeout(() => goTo(currentIndex + 1), interval);
		}

		function goTo(index) {
			// Wraps in both directions.
			const nextIndex = ((index % slides.length) + slides.length) % slides.length;
			if (nextIndex === currentIndex) return;

			currentIndex = nextIndex;
			render();
			sliceIn(slides[currentIndex]);
			restartProgressBar();
			queueNextSlide();
		}

		function refreshPausedState() {
			rail?.toggleAttribute('data-paused', !canAutoplay());

			if (canAutoplay()) queueNextSlide();
			else clearTimeout(advanceTimer);
		}

		function setPausedByUser(shouldPause) {
			pausedByUser = shouldPause;

			pauseButton?.setAttribute('aria-pressed', String(shouldPause));
			pauseButton?.setAttribute(
				'aria-label',
				shouldPause ? 'Resume automatic rotation' : 'Pause automatic rotation'
			);
			if (pauseIcon) pauseIcon.hidden = shouldPause;
			if (playIcon) playIcon.hidden = !shouldPause;

			refreshPausedState();
		}

		function suspend(shouldSuspend) {
			suspended = shouldSuspend;
			refreshPausedState();
		}

		// ── wiring ──────────────────────────────────────────────────────────

		thumbnails.forEach((thumbnail) => {
			thumbnail.addEventListener('click', () => goTo(Number(thumbnail.dataset.slideIndex)));
		});

		carousel
			.querySelector('[data-hero-previous]')
			?.addEventListener('click', () => goTo(currentIndex - 1));
		carousel
			.querySelector('[data-hero-next]')
			?.addEventListener('click', () => goTo(currentIndex + 1));
		pauseButton?.addEventListener('click', () => setPausedByUser(!pausedByUser));

		carousel.addEventListener('keydown', (event) => {
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				goTo(currentIndex + 1);
			} else if (event.key === 'ArrowLeft') {
				event.preventDefault();
				goTo(currentIndex - 1);
			}
		});

		// Nothing should move under someone who's reading or tabbing through it.
		carousel.addEventListener('mouseenter', () => suspend(true));
		carousel.addEventListener('mouseleave', () => suspend(false));
		carousel.addEventListener('focusin', () => suspend(true));
		carousel.addEventListener('focusout', () => suspend(false));
		document.addEventListener('visibilitychange', () => suspend(document.hidden));

		carousel.addEventListener('pointerdown', (event) => {
			if (event.pointerType === 'mouse' && event.button !== 0) return;
			pointerStartX = event.clientX;
			dragging = true;
		});

		carousel.addEventListener('pointerup', (event) => {
			if (!dragging) return;
			dragging = false;

			const travelled = event.clientX - pointerStartX;
			if (Math.abs(travelled) > SWIPE_THRESHOLD) {
				goTo(currentIndex + (travelled < 0 ? 1 : -1));
			}
		});

		carousel.addEventListener('pointercancel', () => (dragging = false));
		reducedMotion.addEventListener('change', refreshPausedState);

		render();
		queueNextSlide();

		if (document.readyState === 'complete') warmImages();
		else window.addEventListener('load', warmImages, { once: true });
	}

	document.addEventListener('DOMContentLoaded', () => {
		document.querySelectorAll('[data-hero-carousel]').forEach(setUpCarousel);
	});

	A1.slider = { init: setUpCarousel };
})();
