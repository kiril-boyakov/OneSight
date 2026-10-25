(() => {
  const section = document.querySelector('#work');
  const reel = section?.querySelector('.project-reel');
  if (!reel) return;
  const cards = [...reel.querySelectorAll('.reel-card')];
  const previous = reel.querySelector('.reel-prev');
  const next = reel.querySelector('.reel-next');
  const count = reel.querySelector('.reel-count');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, frame = 0, start = null;
  function render() {
    frame = 0;
    if (motion.matches) return;
    const rect = section.getBoundingClientRect();
    const travel = Math.max(1, section.offsetHeight - innerHeight);
    const progress = Math.max(0, Math.min(cards.length - 1, -rect.top / travel * (cards.length - 1)));
    const active = Math.round(progress);
    cards.forEach((card, i) => {
      const offset = i - progress;
      card.style.setProperty('--offset', offset.toFixed(4));
      card.style.setProperty('--distance', Math.abs(offset).toFixed(4));
      card.style.setProperty('--layer', 10 - Math.round(Math.abs(offset) * 4));
      card.querySelector('a').tabIndex = i === active ? 0 : -1;
      card.setAttribute('aria-label', `${i + 1} of ${cards.length}`);
    });
    if (active !== current || !count.dataset.ready) {
      current = active;
      count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      count.dataset.ready = 'true';
      previous.disabled = active === 0;
      next.disabled = active === cards.length - 1;
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  function go(index) {
    if (motion.matches) return;
    index = Math.max(0, Math.min(cards.length - 1, index));
    const top = section.getBoundingClientRect().top + scrollY;
    const travel = section.offsetHeight - innerHeight;
    window.scrollTo({top: top + travel * index / (cards.length - 1), behavior: 'smooth'});
  }
  previous.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  reel.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); go(current + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });
  const stage = reel.querySelector('.reel-stage');
  stage.addEventListener('touchstart', e => { const t = e.touches[0]; start = {x:t.clientX,y:t.clientY}; }, {passive:true});
  stage.addEventListener('touchend', e => {
    if (!start) return;
    const t = e.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(current + (dx < 0 ? 1 : -1));
    start = null;
  }, {passive:true});
  stage.addEventListener('touchcancel', () => {start = null;}, {passive:true});
  function setup() {
    section.classList.toggle('reel-ready', !motion.matches);
    if (motion.matches) cards.forEach(card => card.querySelector('a').removeAttribute('tabindex'));
    else render();
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  motion.addEventListener('change', setup);
  setup();
})();
