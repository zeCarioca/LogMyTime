/**
 * Tab Navigation Component
 * Switches active tabs between 'Timer' and 'Data' (and extensible to more).
 */
document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  if (!tabButtons.length || !tabPanes.length) return;

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;

      // Update button active state
      tabButtons.forEach(btn => {
        const isActive = btn === button;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      // Update pane active state
      tabPanes.forEach(pane => {
        if (pane.id === `tab-${targetTab}`) {
          pane.classList.add('active');
          pane.hidden = false;
        } else {
          pane.classList.remove('active');
          pane.hidden = true;
        }
      });
    });
  });
});
