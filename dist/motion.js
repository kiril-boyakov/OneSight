// Only visible animated sections participate in scroll rendering.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const focusMark = '<i></i><i></i><i></i><i></i><b></b>';
document.querySelectorAll('.hero-star,.target,.inquiry-star').forEach(mark => {
  mark.classList.add('focus-mark');
  mark.innerHTML = focusMark;
});
let cleanupMotion = () => {};
function setupMotion() {
  cleanupMotion();
  if (reduceMotion.matches) return;
  document.documentElement.classList.add('cinema');
  const candidates = [...document.querySelectorAll('.intro h2,.body-copy,.service-list details,.section-top,.work-caption,.process h2,.steps article,.about-copy > *, .reviews h2,.review-empty,.faq h2,.faq details,.inquiry-intro > *,#project-form')];
  const candidateSet = new Set(candidates);
  candidates.forEach(el => {
    el.classList.add('cinema-reveal');
    const siblings = [...el.parentElement.children].filter(child => candidateSet.has(child));
    el.style.setProperty('--delay', `${Math.min(siblings.indexOf(el), 3) * 75}ms`);
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.04, rootMargin: '0px 0px -12px 0px' });
  candidates.forEach(el => observer.observe(el));
  const hero = document.querySelector('.hero');
  const animated = [...document.querySelectorAll('main > .services,main > .about,main > .inquiry')];
  const visible = new Set();
  const last = new WeakMap();
  let frame = 0, heroHeight = hero?.offsetHeight || 1, lastHero = '';
  const nearby = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    schedule();
  }, {rootMargin:'100px 0px'});
  animated.forEach(section => nearby.observe(section));
  function render() {
    frame = 0;
    const height = innerHeight;
    // Finish all geometry reads before changing styles (avoids forced layout).
    const updates = [...visible].map(section => {
      const rect = section.getBoundingClientRect();
      return {section, entrance: Math.max(0, Math.min(1, (height - rect.top) / (height * .9))).toFixed(3),
        drift: `${Math.max(-25, Math.min(25, (height / 2 - rect.top - rect.height / 2) * .065)).toFixed(2)}px`};
    });
    const progress = Math.max(0, Math.min(1, scrollY / heroHeight)).toFixed(3);
    updates.forEach(({section, entrance, drift}) => {
      const previous = last.get(section) || {};
      if (entrance !== previous.entrance) section.style.setProperty('--entrance', entrance);
      if (section.classList.contains('about') && drift !== previous.drift) section.style.setProperty('--drift', drift);
      last.set(section, {entrance, drift});
    });
    if (hero && progress !== lastHero) {
      hero.style.setProperty('--hero-progress', progress);
      lastHero = progress;
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  const resize = new ResizeObserver(() => { heroHeight = hero?.offsetHeight || 1; schedule(); });
  if (hero) resize.observe(hero);
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  schedule();
  cleanupMotion = () => {
    observer.disconnect(); nearby.disconnect(); resize.disconnect();
    cancelAnimationFrame(frame);
    removeEventListener('scroll', schedule);
    removeEventListener('resize', schedule);
    document.documentElement.classList.remove('cinema');
    candidates.forEach(el => el.classList.remove('cinema-reveal', 'is-visible'));
  };
}
setupMotion();
reduceMotion.addEventListener('change', setupMotion);
