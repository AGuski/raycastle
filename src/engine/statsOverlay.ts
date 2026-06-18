import Stats from 'stats.js/src/Stats.js';

export function mountStatsOverlay(): Stats {
  const stats = new Stats();
  stats.domElement.style.position = 'fixed';
  stats.domElement.style.top = '0';
  stats.domElement.style.left = '0';
  stats.domElement.style.zIndex = '10000';
  document.body.appendChild(stats.domElement);
  return stats;
}
