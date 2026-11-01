// 3D clothing rack: tees hang on a chrome rail and are browsed by scrolling the page
// (the section is sticky, scroll position drives the rail), dragging/swiping, arrows or keys.
// Each garment swings on its hook with spring physics; hovering one turns it to face you.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class HangerRack {
  constructor({ section, sticky, stage, container, items, onHover, onLeave, onPick, onIndex, onFrame }) {
    Object.assign(this, { section, sticky, stage, container, items, onHover, onLeave, onPick, onIndex, onFrame });
    this.n = items.length;
    this.pos = 0;
    this.prevPos = 0;
    this.hot = -1;
    this.index = -1;
    this.swing = items.map((_, i) => ({ a: (i % 2 ? 1 : -1) * 3, w: 0 }));
    this.focus = items.map(() => 0);
    this.swingEls = items.map((el) => el.querySelector('.swing'));
    items.forEach((el, i) => {
      el.dataset.i = i;
      container.appendChild(el);
    });
    this.measure();
    addEventListener('resize', () => this.measure());
    this.bind();
    requestAnimationFrame(() => this.tick());
  }

  measure() {
    this.iw = this.items[0].offsetWidth || 260;
  }

  // scroll range during which the sticky stage is pinned
  range() {
    const pin = parseFloat(getComputedStyle(this.sticky).top) || 0;
    const start = this.section.getBoundingClientRect().top + scrollY - pin;
    return { start, len: Math.max(1, this.section.offsetHeight - this.sticky.offsetHeight) };
  }
  scrollPos() {
    const { start, len } = this.range();
    return clamp((scrollY - start) / len, 0, 1) * (this.n - 1);
  }
  scrollFor(i) {
    const { start, len } = this.range();
    return start + (clamp(i, 0, this.n - 1) / (this.n - 1)) * len;
  }
  goTo(i) {
    scrollTo({ top: this.scrollFor(i), behavior: 'smooth' });
  }
  next() { this.goTo(Math.round(this.pos) + 1); }
  prev() { this.goTo(Math.round(this.pos) - 1); }

  cancelIntent() {
    clearTimeout(this.intent);
  }
  setHot(i) {
    if (this.hot === i) return;
    this.hot = i;
    if (i >= 0) {
      this.swing[i].w += 1.6; // little wiggle when picked up
      this.onHover?.(i, this.items[i]);
    }
  }
  clearHot() {
    if (this.hot < 0) return;
    this.hot = -1;
    this.onLeave?.(true);
  }

  bind() {
    const s = this.stage;
    this.items.forEach((el, i) => {
      el.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || this.dragging) return;
        clearTimeout(this.intent);
        // hover intent: while a card is open, only switch tees if the pointer rests here,
        // so sweeping across neighbours on the way to the card doesn't hijack it
        if (this.hot < 0 || this.hot === i) this.setHot(i);
        else this.intent = setTimeout(() => this.setHot(i), 250);
      });
      el.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(this.intent);
        if (this.hot === i) this.onLeave?.(false);
      });
      el.addEventListener('click', (e) => {
        if (this.dragged) return;
        if (this.hot !== i) {
          this.setHot(i); // touch: first tap shows details
          e.stopPropagation();
        } else this.onPick?.(i);
      });
    });

    // drag / swipe horizontally → moves along the rail (by scrolling the page)
    let startX = 0, lastX = 0, startY = 0, active = false;
    s.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.hover-card')) return;
      active = true;
      this.dragged = false;
      startX = lastX = e.clientX;
      startY = e.clientY;
    });
    addEventListener('pointermove', (e) => {
      if (!active) return;
      const dx = e.clientX - lastX;
      if (!this.dragging && Math.abs(e.clientX - startX) > 8 && Math.abs(e.clientX - startX) > Math.abs(e.clientY - startY)) {
        this.dragging = this.dragged = true;
        s.classList.add('dragging');
        this.clearHot();
      }
      if (this.dragging) {
        const { len } = this.range();
        scrollTo({ top: scrollY - (dx / (this.iw * 0.9)) * (len / (this.n - 1)), behavior: 'instant' });
      }
      lastX = e.clientX;
    });
    const end = () => {
      if (!active) return;
      active = false;
      if (this.dragging) {
        this.dragging = false;
        s.classList.remove('dragging');
        this.goTo(Math.round(this.scrollPos()));
        setTimeout(() => (this.dragged = false), 50);
      }
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);

    s.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical wheel = normal page scroll
      e.preventDefault();
      const { len } = this.range();
      scrollTo({ top: scrollY + e.deltaX * (len / (this.n - 1)) / (this.iw * 0.9), behavior: 'instant' });
    }, { passive: false });

    s.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { this.next(); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { this.prev(); e.preventDefault(); }
      if (e.key === 'Enter') { this.onPick?.(Math.round(this.pos)); e.preventDefault(); }
    });

    // gently snap to the nearest hanger when scrolling stops inside the rack
    let idle;
    addEventListener('scroll', () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        if (this.dragging) return;
        const { start, len } = this.range();
        if (scrollY <= start + 2 || scrollY >= start + len - 2) return;
        const target = this.scrollFor(Math.round(this.scrollPos()));
        if (Math.abs(target - scrollY) > 3) scrollTo({ top: target, behavior: 'smooth' });
      }, 180);
    }, { passive: true });
  }

  tick() {
    const target = this.scrollPos();
    this.pos += (target - this.pos) * 0.14;
    if (Math.abs(target - this.pos) < 0.0005) this.pos = target;
    const vel = this.pos - this.prevPos;
    this.prevPos = this.pos;
    if (Math.abs(vel) > 0.025 && this.hot >= 0) this.clearHot();

    const S1 = this.iw * 0.95, S2 = this.iw * 0.36;
    for (let i = 0; i < this.n; i++) {
      const el = this.items[i];
      const d = i - this.pos, ad = Math.abs(d), sg = Math.sign(d);
      const f = (this.focus[i] += ((this.hot === i ? 1 : 0) - this.focus[i]) * 0.16);
      const sw = this.swing[i];
      // garments lag behind the rail's motion and settle like pendulums
      sw.w += -0.03 * sw.a - 0.07 * sw.w + (vel * 26) / (1 + ad * 0.4);
      sw.a = clamp(sw.a + sw.w, -18, 18);
      const x = sg * (ad <= 1 ? ad * S1 : S1 + (ad - 1) * S2);
      const ry = clamp(d, -1, 1) * -64 * (1 - f);
      const z = -Math.min(ad, 5) * 60 + f * 120;
      el.style.transform = `translateX(${x.toFixed(1)}px) translateZ(${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
      this.swingEls[i].style.transform = `rotate(${sw.a.toFixed(2)}deg)`;
      el.style.zIndex = 500 - Math.round(ad * 20) + Math.round(f * 400);
      el.style.opacity = ad > 5 ? Math.max(0, 6 - ad).toFixed(2) : '1';
      el.classList.toggle('center', ad < 0.5);
      el.classList.toggle('hot', this.hot === i);
    }
    const idx = Math.round(this.pos);
    if (idx !== this.index) {
      this.index = idx;
      this.onIndex?.(idx, this.pos);
    }
    this.onFrame?.(this);
    requestAnimationFrame(() => this.tick());
  }
}
