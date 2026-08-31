/*
 * Client-side form validation.
 *
 * Each field declares its own rule in the markup — data-validate="required" or
 * "email" or "message", plus an optional data-error-message for the wording —
 * so this file doesn't need to know anything about the individual forms, and
 * has no opinion on what happens after a valid submission. A valid submit is
 * simply not blocked: it falls through to whatever the form's own `action`
 * and `method` attributes say, exactly like a form with no JavaScript at all.
 * Point `action` at your own endpoint and this file never has to change.
 *
 * Give a form `novalidate` and this file's own error styling replaces the
 * browser's default validation bubbles — the markup for that (.field__error,
 * matched to each field by `data-error-for="<name>"`) needs to already be in
 * the page; nothing here builds it.
 *
 * Three small, unrelated field enhancements live below the validator for the
 * same reason the rest of this file exists: each reads its own data-*
 * attributes, no-ops if they're not on the page, and needs nothing else
 * wired up — a linked date range, a password show/hide toggle, and the
 * chosen-file label a styled file input can't show natively.
 */
window.A1 = window.A1 || {};

(() => {
	const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const MIN_MESSAGE_LENGTH = 10;

	function errorElementFor(field) {
		return document.querySelector(`[data-error-for="${field.name}"]`);
	}

	function showError(field, message) {
		field.setAttribute('aria-invalid', 'true');

		const errorElement = errorElementFor(field);
		if (!errorElement) return;

		// Keep the hint out of the way while an error is showing.
		errorElement.querySelector('[data-error-text]').textContent = message;
		errorElement.hidden = false;

		const hint = document.querySelector(`[data-hint-for="${field.name}"]`);
		if (hint) hint.hidden = true;
	}

	function clearError(field) {
		field.removeAttribute('aria-invalid');

		const errorElement = errorElementFor(field);
		if (errorElement) errorElement.hidden = true;

		const hint = document.querySelector(`[data-hint-for="${field.name}"]`);
		if (hint) hint.hidden = false;
	}

	function validateField(field) {
		const rule = field.dataset.validate;
		if (!rule) return true;

		const value = field.value.trim();
		const customMessage = field.dataset.errorMessage;

		// A checkbox's value is "on" whether or not it is ticked, so the text
		// rules below would pass it unconditionally. Consent boxes have to be
		// judged on `checked` instead.
		if (field.type === 'checkbox') {
			if (rule === 'required' && !field.checked) {
				showError(field, customMessage || 'Required.');
				return false;
			}

			clearError(field);
			return true;
		}

		if (rule === 'required' && !value) {
			showError(field, customMessage || 'Required.');
			return false;
		}

		if (rule === 'email' && !EMAIL_PATTERN.test(value)) {
			showError(field, customMessage || 'Enter a valid email address.');
			return false;
		}

		if (rule === 'message' && value.length < MIN_MESSAGE_LENGTH) {
			showError(field, customMessage || 'Please give us a little more detail.');
			return false;
		}

		clearError(field);
		return true;
	}

	// Two linked date inputs: picking one bounds what the other will accept,
	// so "to" can never land before "from". Each field still works on its own
	// if the wrapper or its partner isn't there.
	function setUpDateRanges() {
		document.querySelectorAll('[data-date-range]').forEach((wrap) => {
			const from = wrap.querySelector('[data-date-from]');
			const to = wrap.querySelector('[data-date-to]');
			if (!from || !to) return;

			from.addEventListener('change', () => {
				to.min = from.value;
			});
			to.addEventListener('change', () => {
				from.max = to.value;
			});
		});
	}

	// A button that swaps a password field's type, so its value is readable
	// for a moment. aria-pressed carries the state; the two icons inside just
	// follow it via [hidden].
	function setUpPasswordToggles() {
		document.querySelectorAll('[data-password-toggle]').forEach((button) => {
			const input = document.getElementById(button.getAttribute('aria-controls'));
			if (!input) return;

			button.addEventListener('click', () => {
				const revealing = input.type === 'password';
				input.type = revealing ? 'text' : 'password';
				button.setAttribute('aria-pressed', String(revealing));
				button.setAttribute('aria-label', revealing ? 'Hide password' : 'Show password');
				button.querySelectorAll('[data-icon]').forEach((icon) => {
					icon.hidden = icon.dataset.icon !== (revealing ? 'hide' : 'show');
				});
			});
		});
	}

	// The browser already prints the chosen filename next to its own file
	// button, so this line only needs to appear once there's actually a
	// file — otherwise it would just repeat that native text a second time.
	function setUpFileInputs() {
		document.querySelectorAll('[data-file-input]').forEach((input) => {
			const output = document.querySelector(`[data-file-name-for="${input.name}"]`);
			if (!output) return;

			input.addEventListener('change', () => {
				const hasFile = input.files.length > 0;
				output.textContent = hasFile ? `Selected: ${input.files[0].name}` : '';
				output.hidden = !hasFile;
			});
		});
	}

	function setUpForm(form) {
		const fields = [...form.querySelectorAll('[data-validate]')];

		// Only re-check on blur once a field has already been marked wrong —
		// nagging someone mid-typing is worse than saying nothing.
		fields.forEach((field) => {
			field.addEventListener('blur', () => {
				if (field.hasAttribute('aria-invalid')) validateField(field);
			});

			// A checkbox has nothing to type, so waiting for blur would leave
			// the error showing after the box has already been ticked.
			if (field.type === 'checkbox') {
				field.addEventListener('change', () => {
					if (field.hasAttribute('aria-invalid')) validateField(field);
				});
			}
		});

		form.addEventListener('submit', (event) => {
			const invalidFields = fields.filter((field) => !validateField(field));
			if (invalidFields.length === 0) return; // let the browser submit it normally

			event.preventDefault();
			invalidFields[0].focus();
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		document.querySelectorAll('[data-validated-form]').forEach(setUpForm);
		setUpDateRanges();
		setUpPasswordToggles();
		setUpFileInputs();

		// The footer's copyright year, so nobody has to remember to update it.
		document.querySelectorAll('[data-current-year]').forEach((slot) => {
			slot.textContent = new Date().getFullYear();
		});
	});
})();
