(() => {
  const focusMark = '<i></i><i></i><i></i><i></i><b></b>';
  document.querySelectorAll('.hero-star,.target,.inquiry-star').forEach(mark => {
    mark.classList.add('focus-mark'); mark.innerHTML = focusMark;
  });
  document.querySelectorAll('.logo').forEach(logo => {
    const mark = document.createElement('span');
    mark.className = 'brand-focus'; mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = '<i></i><b></b>';
    logo.prepend(mark);
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let loaded = false;
  function load() {
    if (loaded || reduced.matches) return;
    loaded = true;
    import('/experience-9c07516ba96d.js').catch(() => { loaded = false; });
  }
  const defer = () => 'requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 1600 }) : setTimeout(load, 300);
  if (document.readyState === 'complete') defer();
  else window.addEventListener('load', defer, { once: true });
  reduced.addEventListener('change', load);
})();
