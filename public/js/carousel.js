// Draggable, inertial 3D ring carousel (pure CSS 3D transforms + rAF physics).
export class Carousel3D {
  constructor(stage, cards, { onChange, onPick, autoplay = true } = {}) {
    this.stage = stage;
    this.cards = cards;
    this.n = cards.length;
    this.theta = 360 / this.n;
    this.onChange = onChange;
    this.onPick = onPick;
    this.angle = 0;
    this.target = 0;
    this.velocity = 0;
    this.index = 0;
    this.dragging = false;
    this.autoplay = autoplay;
    this.lastInteract = 0;

    this.ring = document.createElement('div');
    this.ring.className = 'ring';
    cards.forEach((c, i) => {
      c.dataset.index = i;
      c.setAttribute('role', 'option');
      this.ring.appendChild(c);
    });
    stage.appendChild(this.ring);

    this.measure();
    addEventListener('resize', () => this.measure());
    this.bind();
    requestAnimationFrame((t) => this.tick(t));
  }

  measure() {
    const w = this.stage.offsetWidth;
    this.radius = Math.round(w / 2 / Math.tan(Math.PI / this.n)) + Math.max(28, w * 0.18);
    this.cards.forEach((c, i) => (c.style.transform = `rotateY(${i * this.theta}deg) translateZ(${this.radius}px)`));
  }

  bind() {
    const s = this.stage;
    let startX = 0, lastX = 0, lastT = 0, moved = 0;
    s.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.dragging = true;
      startX = lastX = e.clientX;
      lastT = performance.now();
      moved = 0;
      this.velocity = 0;
      s.classList.add('dragging');
      s.setPointerCapture(e.pointerId);
      this.touch();
    });
    s.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - lastX;
      const now = performance.now();
      moved = Math.max(moved, Math.abs(e.clientX - startX));
      const deg = dx * (this.theta / this.stage.offsetWidth) * 1.4;
      this.angle += deg;
      this.target = this.angle;
      this.velocity = deg / Math.max(1, now - lastT) * 16;
      lastX = e.clientX;
      lastT = now;
    });
    const end = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      s.classList.remove('dragging');
      if (moved < 6) {
        const card = document.elementFromPoint(e.clientX, e.clientY)?.closest('.card');
        if (card) this.clickCard(Number(card.dataset.index));
        this.snapTo(this.nearest(this.angle));
        return;
      }
      // fling: project with velocity, then snap
      const projected = this.angle + this.velocity * 12;
      this.snapTo(this.nearest(projected));
    };
    s.addEventListener('pointerup', end);
    s.addEventListener('pointercancel', end);
    s.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { this.next(); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { this.prev(); e.preventDefault(); }
      if (e.key === 'Enter' || e.key === ' ') { this.onPick?.(this.index); e.preventDefault(); }
    });
    s.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return; // only horizontal trackpad swipes
      e.preventDefault();
      this.touch();
      clearTimeout(this.wheelT);
      this.angle -= e.deltaX * 0.15;
      this.target = this.angle;
      this.wheelT = setTimeout(() => this.snapTo(this.nearest(this.angle)), 120);
    }, { passive: false });
    s.addEventListener('mouseenter', () => (this.hover = true));
    s.addEventListener('mouseleave', () => (this.hover = false));
  }

  touch() { this.lastInteract = performance.now(); }
  nearest(a) { return Math.round(a / this.theta) * this.theta; }
  snapTo(a) { this.target = a; }
  indexFor(a) { return ((Math.round(-a / this.theta) % this.n) + this.n) % this.n; }

  goTo(i) {
    this.touch();
    // shortest rotation to bring card i to the front
    const cur = this.indexFor(this.target);
    let d = i - cur;
    if (d > this.n / 2) d -= this.n;
    if (d < -this.n / 2) d += this.n;
    this.target -= d * this.theta;
  }
  next() { this.touch(); this.target -= this.theta; }
  prev() { this.touch(); this.target += this.theta; }

  clickCard(i) {
    this.touch();
    if (i === this.index) this.onPick?.(i);
    else this.goTo(i);
  }

  tick(t) {
    if (!this.dragging) {
      // autoplay after 6s idle, paused on hover
      if (this.autoplay && !this.hover && t - this.lastInteract > 6000 && Math.abs(this.target - this.angle) < 0.05) {
        this.lastInteract = t - 2500; // next step in ~3.5s
        this.target -= this.theta;
      }
      this.angle += (this.target - this.angle) * 0.09;
    }
    this.ring.style.transform = `translateZ(${-this.radius}px) rotateY(${this.angle}deg)`;

    for (let i = 0; i < this.n; i++) {
      let a = (i * this.theta + this.angle) % 360;
      if (a > 180) a -= 360;
      if (a < -180) a += 360;
      const facing = Math.cos((a * Math.PI) / 180); // 1 front, -1 back
      const c = this.cards[i];
      c.style.opacity = (0.25 + 0.75 * Math.max(0, (facing + 0.4) / 1.4)).toFixed(3);
      c.style.filter = `brightness(${(0.45 + 0.55 * Math.max(0, facing)).toFixed(3)})`;
      c.style.zIndex = Math.round(facing * 100) + 100;
    }

    const idx = this.indexFor(this.angle);
    if (idx !== this.index || !this.started) {
      this.started = true;
      this.cards[this.index]?.classList.remove('front');
      this.cards[this.index]?.setAttribute('aria-selected', 'false');
      this.index = idx;
      this.cards[idx].classList.add('front');
      this.cards[idx].setAttribute('aria-selected', 'true');
      this.onChange?.(idx);
    }
    requestAnimationFrame((tt) => this.tick(tt));
  }
}
