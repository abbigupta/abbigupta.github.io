document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  const badgeDate = document.getElementById("badge-date");
  const stage = document.getElementById("badge-stage");
  const card = document.getElementById("badge-card");
  const tether = document.getElementById("tether-line");
  const tetherShadow = document.getElementById("tether-shadow");
  const linkPreview = document.getElementById("link-preview");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (year) year.textContent = String(new Date().getFullYear());
  if (badgeDate) {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
    badgeDate.dateTime = localDate.toISOString().slice(0, 10);
    badgeDate.textContent = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(today);
  }

  if (linkPreview) {
    const previewText = (link) => {
      const href = link.getAttribute("href") || "";
      if (href.startsWith("#")) return `Jump to ${href}`;
      if (href.startsWith("mailto:")) return `Email · ${href.slice(7)}`;
      if (href.startsWith("tel:")) return `Call · ${link.textContent.trim().replace("↗", "").trim()}`;

      try {
        const destination = new URL(link.href, window.location.href);
        const hostname = destination.hostname.replace(/^www\./, "");
        const path = destination.pathname === "/" ? "" : destination.pathname.replace(/\/$/, "");
        return `${hostname}${decodeURIComponent(path)}`;
      } catch {
        return href;
      }
    };

    const positionPreview = (x, y) => {
      const gap = 16;
      const edge = 10;
      const bounds = linkPreview.getBoundingClientRect();
      const left = Math.min(Math.max(edge, x + gap), window.innerWidth - bounds.width - edge);
      const top = y + gap + bounds.height > window.innerHeight
        ? y - bounds.height - gap
        : y + gap;
      linkPreview.style.left = `${left}px`;
      linkPreview.style.top = `${Math.max(edge, top)}px`;
    };

    document.querySelectorAll("a[href]").forEach((link) => {
      link.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "touch") return;
        linkPreview.textContent = previewText(link);
        linkPreview.classList.add("is-visible");
        positionPreview(event.clientX, event.clientY);
      });

      link.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "touch") positionPreview(event.clientX, event.clientY);
      });

      link.addEventListener("pointerleave", () => linkPreview.classList.remove("is-visible"));
      link.addEventListener("focus", () => {
        const bounds = link.getBoundingClientRect();
        linkPreview.textContent = previewText(link);
        linkPreview.classList.add("is-visible");
        positionPreview(bounds.left + bounds.width / 2, bounds.bottom);
      });
      link.addEventListener("blur", () => linkPreview.classList.remove("is-visible"));
    });
  }

  if (!stage || !card || !tether || !tetherShadow) return;

  const state = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    pointerId: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    lastPointerTime: 0,
    lastFrameTime: 0,
    animationFrame: 0,
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const metrics = () => {
    const stageRect = stage.getBoundingClientRect();
    const styles = getComputedStyle(card);
    return {
      stageRect,
      cardWidth: card.offsetWidth,
      cardHeight: card.offsetHeight,
      baseX: stageRect.width / 2,
      baseY: Number.parseFloat(styles.top) || card.offsetTop,
      anchorY: 80,
    };
  };

  const draw = () => {
    const { baseX, baseY, anchorY } = metrics();
    const attachmentX = baseX + state.x;
    const attachmentY = baseY + state.y;
    const bend = attachmentX - baseX;
    const height = attachmentY - anchorY;
    const path = [
      `M ${baseX.toFixed(2)} ${anchorY}`,
      `C ${(baseX + bend * 0.1).toFixed(2)} ${(anchorY + height * 0.34).toFixed(2)},`,
      `${(attachmentX - bend * 0.16).toFixed(2)} ${(attachmentY - height * 0.2).toFixed(2)},`,
      `${attachmentX.toFixed(2)} ${attachmentY.toFixed(2)}`,
    ].join(" ");

    card.style.transform = `translate3d(calc(-50% + ${state.x.toFixed(2)}px), ${state.y.toFixed(2)}px, 0) rotate(${state.angle.toFixed(2)}deg)`;
    tether.setAttribute("d", path);
    tetherShadow.setAttribute("d", path);
  };

  const stopAnimation = () => {
    if (!state.animationFrame) return;
    cancelAnimationFrame(state.animationFrame);
    state.animationFrame = 0;
  };

  const animate = (now) => {
    if (state.pointerId !== null || reduceMotion.matches) {
      state.animationFrame = 0;
      return;
    }

    if (!state.lastFrameTime) state.lastFrameTime = now;
    const dt = Math.min((now - state.lastFrameTime) / 1000, 0.032);
    state.lastFrameTime = now;

    // A deliberately under-damped spring gives the badge a few visible
    // overshoots instead of snapping directly back to its resting point.
    const spring = 35;
    const damping = 2;
    state.vx += (-spring * state.x - damping * state.vx) * dt;
    state.vy += (-spring * state.y - damping * state.vy) * dt;
    state.x += state.vx * dt;
    state.y += state.vy * dt;

    const rotationalSpring = 30;
    const rotationalDamping = 3;
    const movementTorque = state.vx * 0.035;
    state.angularVelocity += (-rotationalSpring * state.angle - rotationalDamping * state.angularVelocity + movementTorque) * dt;
    state.angle += state.angularVelocity * dt;

    draw();

    const motion = Math.abs(state.x) + Math.abs(state.y) + Math.abs(state.vx) + Math.abs(state.vy) + Math.abs(state.angle) + Math.abs(state.angularVelocity);
    if (motion > 0.35) {
      state.animationFrame = requestAnimationFrame(animate);
    } else {
      Object.assign(state, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, angularVelocity: 0, lastFrameTime: 0, animationFrame: 0 });
      draw();
    }
  };

  const startAnimation = () => {
    stopAnimation();
    state.lastFrameTime = 0;
    state.animationFrame = requestAnimationFrame(animate);
  };

  const release = (event) => {
    if (state.pointerId === null || (event.pointerId !== undefined && event.pointerId !== state.pointerId)) return;
    if (card.hasPointerCapture?.(state.pointerId)) card.releasePointerCapture(state.pointerId);
    state.pointerId = null;
    card.classList.remove("is-dragging");

    if (reduceMotion.matches) {
      Object.assign(state, { x: 0, y: 0, vx: 0, vy: 0, angle: 0, angularVelocity: 0 });
      draw();
      return;
    }

    state.angularVelocity += clamp(state.vx * 0.075, -110, 110);
    startAnimation();
  };

  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    stopAnimation();

    const { stageRect, baseX, baseY } = metrics();
    const pointerX = event.clientX - stageRect.left;
    const pointerY = event.clientY - stageRect.top;

    state.pointerId = event.pointerId;
    state.dragOffsetX = pointerX - (baseX + state.x);
    state.dragOffsetY = pointerY - (baseY + state.y);
    state.lastPointerX = pointerX;
    state.lastPointerY = pointerY;
    state.lastPointerTime = performance.now();
    state.vx = 0;
    state.vy = 0;
    state.angularVelocity = 0;
    card.classList.add("is-dragging");
    card.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  card.addEventListener("pointermove", (event) => {
    if (event.pointerId !== state.pointerId) return;

    const { stageRect, cardWidth, cardHeight, baseX, baseY, anchorY } = metrics();
    const pointerX = event.clientX - stageRect.left;
    const pointerY = event.clientY - stageRect.top;
    const now = performance.now();
    const dt = Math.max((now - state.lastPointerTime) / 1000, 0.008);
    const nextX = pointerX - state.dragOffsetX - baseX;
    const nextY = pointerY - state.dragOffsetY - baseY;
    const horizontalLimit = Math.max(25, stageRect.width / 2 - cardWidth * 0.22);
    const upperLimit = anchorY + 25 - baseY;
    const lowerLimit = stageRect.height - baseY - cardHeight * 0.22;

    state.vx = clamp((pointerX - state.lastPointerX) / dt, -1800, 1800);
    state.vy = clamp((pointerY - state.lastPointerY) / dt, -1800, 1800);
    state.x = clamp(nextX, -horizontalLimit, horizontalLimit);
    state.y = clamp(nextY, upperLimit, lowerLimit);

    const targetAngle = clamp(state.x * 0.045 + state.vx * 0.012, -24, 24);
    state.angle += (targetAngle - state.angle) * 0.28;
    state.lastPointerX = pointerX;
    state.lastPointerY = pointerY;
    state.lastPointerTime = now;
    draw();
  });

  card.addEventListener("pointerup", release);
  card.addEventListener("pointercancel", release);
  card.addEventListener("lostpointercapture", (event) => {
    if (state.pointerId === event.pointerId) release(event);
  });

  card.addEventListener("keydown", (event) => {
    const impulses = {
      ArrowLeft: [-72, 0],
      ArrowRight: [72, 0],
      ArrowUp: [0, -52],
      ArrowDown: [0, 52],
    };
    if (!impulses[event.key] && event.key !== " ") return;
    event.preventDefault();

    if (event.key === " ") {
      state.vx += 480;
      state.angularVelocity += 55;
    } else {
      const [dx, dy] = impulses[event.key];
      state.x += dx;
      state.y += dy;
      state.vx += dx * 5;
      state.vy += dy * 5;
      state.angle = clamp(state.angle + dx * 0.12, -22, 22);
    }
    draw();
    if (!reduceMotion.matches) startAnimation();
  });

  window.addEventListener("resize", draw, { passive: true });

  const dropBadgeIn = () => {
    if (reduceMotion.matches) {
      draw();
      return;
    }

    const { baseY, anchorY } = metrics();
    state.y = anchorY + 22 - baseY;
    state.vy = 90;
    state.angle = -4.5;
    state.angularVelocity = 22;
    draw();
    startAnimation();
  };

  dropBadgeIn();
});
