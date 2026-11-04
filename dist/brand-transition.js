(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current, timer;
  function show() {
    if (reduced.matches) return;
    current?.remove(); clearTimeout(timer);
    current = document.createElement('div');
    current.className = 'brand-transition'; current.setAttribute('aria-hidden', 'true');
    current.innerHTML = '<span class="brand-focus"><i></i><b></b></span><span>OneSight</span>';
    document.body.append(current);
    const stamp = current;
    stamp.addEventListener('animationend', event => { if (event.target === stamp) stamp.remove(); });
    timer = setTimeout(() => stamp.remove(), 1300);
  }
  document.querySelectorAll('a[href="#inquiry"],a[href="/#inquiry"]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      show();
    });
  });
  reduced.addEventListener('change', () => { if (reduced.matches) {current?.remove();clearTimeout(timer);} });
  show();
})();
