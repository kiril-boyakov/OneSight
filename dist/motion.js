// Progressive enhancement: native scrolling, with lightweight cinematic depth.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const sections = [...document.querySelectorAll('main > section')];
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
  candidates.forEach((el) => {
    el.classList.add('cinema-reveal');
    const siblings = [...el.parentElement.children].filter(child => candidates.includes(child));
    el.style.setProperty('--delay', `${Math.min(siblings.indexOf(el), 3) * 75}ms`);
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.04, rootMargin: '0px 0px -12px 0px' });
  candidates.forEach(el => observer.observe(el));
  let queued = false;
  function render() {
    queued = false;
    const height = innerHeight;
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > height + 100) return;
      const entrance = Math.max(0, Math.min(1, (height - rect.top) / (height * 0.9)));
      section.style.setProperty('--entrance', entrance.toFixed(4));
      section.style.setProperty('--drift', `${Math.max(-25, Math.min(25, (height / 2 - rect.top - rect.height / 2) * .065))}px`);
    });
    const hero = document.querySelector('.hero');
    const progress = Math.min(1, scrollY / (hero.offsetHeight || 1));
    hero.style.setProperty('--hero-progress', progress.toFixed(4));
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(render); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  render();
  cleanupMotion = () => {
    observer.disconnect();
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
    document.documentElement.classList.remove('cinema');
    candidates.forEach(el => el.classList.remove('cinema-reveal', 'is-visible'));
  };
}
setupMotion();
reduceMotion.addEventListener('change', setupMotion);
