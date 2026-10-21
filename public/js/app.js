import { reveal } from './animations.js';
import { initBackground } from './background.js';

initBackground(); reveal();
const page = document.body.dataset.page;
if (page === 'home') {
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
  const [{ initServices }, { initAdmin }, { initMaintenance }] = await Promise.all([import('./services.js'), import('./admin.js'), import('./maintenance.js')]);
  initServices(); initAdmin(); initMaintenance();
} else {
  const { initGallery } = await import('./gallery.js');
  void initGallery(page);
}
