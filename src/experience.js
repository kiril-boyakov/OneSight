import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate } from 'motion/mini';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
const media = gsap.matchMedia();
media.add({ compact: '(max-width:650px)', wide: '(min-width:651px)', motion: '(prefers-reduced-motion: no-preference)' }, context => {
  if (!context.conditions.motion) return;
  const compact = context.conditions.compact;
  const releases = [];
  const active = new Set();
  const play = (element, frames, options = {}) => {
    const animation = animate(element, frames, { duration: .38, ease: [0.22, 1, 0.36, 1], ...options });
    active.add(animation);
    animation.then(() => active.delete(animation));
    return animation;
  };
  const entrance = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entrance.unobserve(entry.target);
      play(entry.target, { transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: .55 });
    }
  }, { threshold: .08 });
  document.querySelectorAll('.intro h2,.service-list details,.steps article,.about-copy h2,.project-detail h2,.review-heading h2,.faq h2,.inquiry-intro h2').forEach(el => entrance.observe(el));
  releases.push(() => entrance.disconnect());

  const progress = document.createElement('span');
  progress.className = 'reading-progress'; progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);
  gsap.fromTo(progress, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  releases.push(() => progress.remove());
  const hero = document.querySelector('.hero');
  const heroMark = hero?.querySelector('.focus-mark');
  if (heroMark) {
    gsap.to(heroMark, { y: compact ? -18 : -55, rotation: compact ? -3 : -8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }
  document.querySelectorAll('.about-art,.project-thumb').forEach(art => {
    const subject = art.querySelector('.orbit,.thumb-frame,.osti-logo,.krainis-logo');
    if (!subject) return;
    gsap.fromTo(subject, { y: compact ? 10 : 22 }, { y: compact ? -10 : -22, ease: 'none', scrollTrigger: { trigger: art, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  document.querySelectorAll('.section-top,.steps article').forEach(section => {
    const line = document.createElement('span');
    line.className = 'section-draw'; line.setAttribute('aria-hidden', 'true'); section.append(line);
    gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: section, start: 'top 92%', once: true } });
    releases.push(() => line.remove());
  });
  const lens = document.querySelector('.review-optic-lens');
  if (lens) gsap.fromTo(lens, { rotation: -28 }, { rotation: 28, ease: 'none', scrollTrigger: { trigger: '#reviews', start: 'top bottom', end: 'bottom top', scrub: true } });

  document.querySelectorAll('.logo').forEach(logo => {
    const mark = logo.querySelector('.brand-focus');
    if (!mark) return;
    let animation;
    const focus = () => {
      animation?.stop();
      animation = play(mark, { transform: ['rotate(-12deg) scale(.86)', 'rotate(0deg) scale(1)'] }, { duration: .45 });
    };
    logo.addEventListener('pointerenter', focus);
    logo.addEventListener('focus', focus);
    releases.push(() => { logo.removeEventListener('pointerenter', focus); logo.removeEventListener('focus', focus); });
  });
  const headerMark = document.querySelector('header .brand-focus');
  if (headerMark && scrollY < 100) play(headerMark, { transform: ['rotate(-45deg) scale(.7)', 'rotate(0deg) scale(1)'] }, { duration: .65 });
  const reviewEntrance = event => {
    event.detail?.forEach(card => entrance.observe(card));
    ScrollTrigger.refresh();
  };
  document.addEventListener('onesight:reviews', reviewEntrance);
  document.querySelectorAll('#approved-reviews .review-card').forEach(card => entrance.observe(card));
  releases.push(() => document.removeEventListener('onesight:reviews', reviewEntrance));
  const refresh = () => ScrollTrigger.refresh();
  document.fonts?.ready.then(refresh);
  document.querySelectorAll('main details').forEach(details => {
    details.addEventListener('toggle', refresh);
    releases.push(() => details.removeEventListener('toggle', refresh));
  });
  return () => {
    releases.forEach(release => release());
    active.forEach(animation => animation.stop());
    active.clear();
  };
});
