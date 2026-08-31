/*
 * Product page: the quantity stepper, and swapping the main image when a
 * thumbnail is clicked.
 *
 * The stepper writes to a hidden input rather than keeping the number in a
 * variable, so the add-to-bag button in cart.js can read it with a plain
 * querySelector via its data-quantity-source attribute.
 */
window.A1 = window.A1 || {};

(() => {
	function setUpQuantityStepper(stepper) {
		const input = stepper.querySelector('[data-quantity-input]');
		const valueLabel = stepper.querySelector('[data-quantity-value]');
		const decreaseButton = stepper.querySelector('[data-quantity-decrease]');
		const increaseButton = stepper.querySelector('[data-quantity-increase]');

		const min = Number(stepper.dataset.min) || 1;
		const max = Number(stepper.dataset.max) || 6;

		function render(quantity) {
			input.value = quantity;
			valueLabel.textContent = quantity;
			decreaseButton.disabled = quantity <= min;
			increaseButton.disabled = quantity >= max;
		}

		decreaseButton.addEventListener('click', () => {
			render(Math.max(min, Number(input.value) - 1));
		});

		increaseButton.addEventListener('click', () => {
			render(Math.min(max, Number(input.value) + 1));
		});

		render(Number(input.value) || min);
	}

	function setUpGallery(gallery) {
		const mainImage = gallery.querySelector('[data-gallery-main]');
		const thumbnails = [...gallery.querySelectorAll('[data-gallery-thumbnail]')];
		if (!mainImage || thumbnails.length < 2) return;

		thumbnails.forEach((thumbnail) => {
			thumbnail.addEventListener('click', () => {
				mainImage.src = thumbnail.dataset.fullImage;

				thumbnails.forEach((other) => other.removeAttribute('aria-current'));
				thumbnail.setAttribute('aria-current', 'true');
			});
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		document.querySelectorAll('[data-quantity-stepper]').forEach(setUpQuantityStepper);
		document.querySelectorAll('[data-gallery]').forEach(setUpGallery);
	});
})();
