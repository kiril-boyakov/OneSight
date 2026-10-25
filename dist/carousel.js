(() => {
  const section = document.querySelector('#work');
  const reel = section?.querySelector('.project-reel');
  if (!reel) return;
  const cards = [...reel.querySelectorAll('.reel-card')];
  const previous = reel.querySelector('.reel-prev');
  const next = reel.querySelector('.reel-next');
  const count = reel.querySelector('.reel-count');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const links = cards.map(card => card.querySelector('a'));
  cards.forEach((card, i) => card.setAttribute('aria-label', `${i + 1} of ${cards.length}`));
  let current = -1, frame = 0, start = null, near = false, lastProgress = -1;
  let travel = 1, mobile = false;
  function measure() {
    travel = Math.max(1, section.offsetHeight - innerHeight);
    mobile = matchMedia('(max-width:650px)').matches;
    lastProgress = -1;
    schedule();
  }
  function render() {
    frame = 0;
    if (motion.matches || !near) return;
    const top = section.getBoundingClientRect().top;
    const progress = Math.max(0, Math.min(cards.length - 1, -top / travel * (cards.length - 1)));
    if (Math.abs(progress - lastProgress) < .0005) return;
    lastProgress = progress;
    const active = Math.round(progress);
    // Direct compositor properties avoid inherited variable/filter work in each card subtree.
    cards.forEach((card, i) => {
      const offset = i - progress, distance = Math.abs(offset);
      card.style.transform = `translateY(-50%) translateX(${(offset * (mobile ? 91 : 79)).toFixed(3)}%) translateZ(${(-distance * (mobile ? 150 : 220)).toFixed(2)}px) rotateY(${(-offset * (mobile ? 22 : 24)).toFixed(2)}deg) rotateZ(${(offset * 3).toFixed(2)}deg)`;
      card.style.opacity = Math.max(0, 1 - distance * .35).toFixed(3);
      const layer = String(10 - Math.round(distance * 4));
      if (card.style.zIndex !== layer) card.style.zIndex = layer;
    });
    if (active !== current) {
      current = active;
      links.forEach((link, i) => { link.tabIndex = i === active ? 0 : -1; });
      count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      previous.disabled = active === 0;
      next.disabled = active === cards.length - 1;
    }
  }
  function schedule() { if (near && !motion.matches && !frame) frame = requestAnimationFrame(render); }
  function go(index) {
    if (motion.matches) return;
    index = Math.max(0, Math.min(cards.length - 1, index));
    const top = section.getBoundingClientRect().top + scrollY;
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
    if (motion.matches) {
      cancelAnimationFrame(frame); frame = 0;
      cards.forEach((card, i) => {
        card.style.removeProperty('transform'); card.style.removeProperty('opacity'); card.style.removeProperty('z-index');
        links[i].removeAttribute('tabindex');
      });
    } else { current = -1; measure(); }
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', measure, {passive:true});
  const visibility = new IntersectionObserver(entries => {
    near = entries[0].isIntersecting;
    section.classList.toggle('reel-near', near);
    if (near) { lastProgress = -1; schedule(); }
    else { cancelAnimationFrame(frame); frame = 0; }
  }, {rootMargin:'150px 0px'});
  visibility.observe(section);
  const resize = new ResizeObserver(measure);
  resize.observe(section);
  motion.addEventListener('change', setup);
  setup();
})();
