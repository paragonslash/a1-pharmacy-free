/*
 * Tabs.
 *
 * Nothing here is page-specific. It wires up every [role="tablist"] it finds,
 * which today means the account page and the component reference.
 *
 * Proper tab semantics: roving tabindex, arrow keys to move between tabs, and
 * each panel wired to its tab with aria-controls / aria-labelledby.
 */
window.A1 = window.A1 || {};

(() => {
	function setUpTabs(tabList) {
		const tabs = [...tabList.querySelectorAll('[role="tab"]')];
		const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

		function select(index, moveFocus = false) {
			tabs.forEach((tab, tabIndex) => {
				const isSelected = tabIndex === index;
				tab.setAttribute('aria-selected', String(isSelected));
				// Only the selected tab is in the tab order; arrows do the rest.
				tab.tabIndex = isSelected ? 0 : -1;
				panels[tabIndex].hidden = !isSelected;
			});

			if (moveFocus) tabs[index].focus();
		}

		tabs.forEach((tab, index) => {
			tab.addEventListener('click', () => select(index));

			tab.addEventListener('keydown', (event) => {
				if (event.key === 'ArrowRight') {
					event.preventDefault();
					select((index + 1) % tabs.length, true);
				} else if (event.key === 'ArrowLeft') {
					event.preventDefault();
					select((index - 1 + tabs.length) % tabs.length, true);
				} else if (event.key === 'Home') {
					event.preventDefault();
					select(0, true);
				} else if (event.key === 'End') {
					event.preventDefault();
					select(tabs.length - 1, true);
				}
			});
		});

		select(0);
	}

	document.addEventListener('DOMContentLoaded', () => {
		document.querySelectorAll('[role="tablist"]').forEach(setUpTabs);
	});
})();
