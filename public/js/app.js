import { reveal } from './animations.js';
import { initBackground } from './background.js';
import { initSpotlight, initGlitch, initFolio } from './fx.js';

initBackground(); initSpotlight(); reveal();
const page = document.body.dataset.page;
if (page === 'home') {
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
  initGlitch(); initFolio();
  const [{ initServices }, { initHealth }, { initAdmin }, { initMaintenance }] = await Promise.all([
    import('./services.js'), import('./health.js'), import('./admin.js'), import('./maintenance.js'),
  ]);
  initServices(); initHealth(); initAdmin(); initMaintenance();
} else {
  const { initGallery } = await import('./gallery.js');
  void initGallery(page);
}
