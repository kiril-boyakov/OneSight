export function setupProcessSequence({gsap, ScrollTrigger, play}) {
  const steps = document.querySelector('.steps');
  if (!steps) return () => {};
  const cards = [...steps.querySelectorAll('article')];
  const rows = new Map();
  for (const card of cards) {
    const row = card.offsetTop;
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(card);
  }
  const decorations = [], timelines = [], triggers = [];
  let nextAvailable = 0;
  for (const row of rows.values()) {
    const timeline = gsap.timeline({paused:true, defaults:{ease:'power3.out'}});
    timelines.push(timeline);
    let at = 0;
    for (const card of row) {
      const rail = document.createElement('span'); rail.className = 'step-rail';
      const wash = document.createElement('span'); wash.className = 'step-wash';
      const signal = document.createElement('span'); signal.className = 'step-signal';
      for (const decoration of [rail, wash, signal]) {
        decoration.setAttribute('aria-hidden', 'true'); card.append(decoration); decorations.push(decoration);
      }
      const number = card.querySelector('span');
      const title = card.querySelector('h3');
      const copy = card.querySelector('p');
      timeline.fromTo(rail, {scaleX:0}, {scaleX:1,duration:.46,ease:'power2.inOut'}, at)
        .fromTo(wash, {scaleY:0}, {scaleY:1,duration:.6}, at + .06)
        .fromTo(signal, {scale:0,rotation:-45}, {scale:1.15,rotation:0,duration:.38}, at + .16)
        .to(signal, {scale:1,duration:.24}, at + .54)
        .call(() => {
          play(number, {transform:['translateY(7px) rotate(-5deg)', 'translateY(0px) rotate(0deg)']}, {duration:.48});
          play(title, {transform:['translateX(12px)', 'translateX(0px)']}, {duration:.45});
          play(copy, {transform:['translateY(8px)', 'translateY(0px)']}, {duration:.48,delay:.06});
        }, null, at + .1);
      at += .48;
    }
    triggers.push(ScrollTrigger.create({trigger:row[0],start:'top 86%',once:true,onEnter:() => {
      const now = performance.now() / 1000;
      const wait = Math.max(0, nextAvailable - now);
      timeline.delay(wait).play();
      nextAvailable = now + wait + row.length * .48;
    }}));
  }
  return () => {
    triggers.forEach(trigger => trigger.kill());
    timelines.forEach(timeline => timeline.kill());
    decorations.forEach(decoration => decoration.remove());
  };
}
