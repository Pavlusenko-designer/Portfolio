const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

const revealItems = document.querySelectorAll("[data-reveal]");

if (!reduceMotion && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const tiltCard = document.querySelector("[data-tilt]");

if (tiltCard && !reduceMotion) {
  const resetTilt = () => {
    tiltCard.style.transform = "";
  };

  tiltCard.addEventListener("pointermove", (event) => {
    const bounds = tiltCard.getBoundingClientRect();
    const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
    const rotateY = offsetX * 10;
    const rotateX = offsetY * -8;

    tiltCard.style.transform =
      `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  tiltCard.addEventListener("pointerleave", resetTilt);
  tiltCard.addEventListener("pointercancel", resetTilt);
}

const orbs = document.querySelectorAll(".backdrop-orb");

if (orbs.length && !reduceMotion) {
  window.addEventListener(
    "scroll",
    () => {
      const offset = window.scrollY;
      orbs.forEach((orb, index) => {
        const speed = index === 0 ? 0.08 : -0.06;
        orb.style.transform = `translate3d(0, ${offset * speed}px, 0)`;
      });
    },
    { passive: true }
  );
}

const setupScrollVideo = () => {
  if (reduceMotion || !hasGsap) {
    return;
  }

  const section = document.querySelector(".video-story-panel");
  const video = document.querySelector(".feature-video");
  const frame = document.querySelector(".video-frame");
  const overlayItems = document.querySelectorAll(".video-overlay span");
  const storyNotes = document.querySelectorAll(".story-note");

  if (!section || !video || !frame) {
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  const state = {
    duration: 0,
    targetTime: 0,
    renderedTime: 0,
    isLocked: false,
    lastActiveIndex: -1,
    lastNoteIndex: -1,
  };

  const setOverlayState = (progress) => {
    const activeIndex = Math.min(
      overlayItems.length - 1,
      Math.floor(progress * overlayItems.length)
    );
    const noteIndex = Math.min(
      storyNotes.length - 1,
      Math.floor(progress * storyNotes.length)
    );

    if (activeIndex !== state.lastActiveIndex) {
      overlayItems.forEach((item, index) => {
        gsap.to(item, {
          autoAlpha: index === activeIndex ? 1 : 0.45,
          y: index === activeIndex ? -6 : 0,
          duration: 0.2,
          overwrite: true,
          ease: "power2.out",
        });
      });
      state.lastActiveIndex = activeIndex;
    }

    if (noteIndex !== state.lastNoteIndex) {
      storyNotes.forEach((note, index) => {
        gsap.to(note, {
          autoAlpha: index <= noteIndex ? 1 : 0.35,
          y: index <= noteIndex ? 0 : 40,
          duration: 0.24,
          overwrite: true,
          ease: "power2.out",
        });
      });
      state.lastNoteIndex = noteIndex;
    }

    gsap.set(frame, {
      scale: 1 + progress * 0.03,
      borderRadius: 36 - progress * 8,
    });
  };

  const renderVideo = () => {
    if (!state.duration) {
      return;
    }

    state.renderedTime += (state.targetTime - state.renderedTime) * 0.18;

    if (Math.abs(state.renderedTime - state.targetTime) < 0.002) {
      state.renderedTime = state.targetTime;
    }

    if (Math.abs(video.currentTime - state.renderedTime) > 0.016) {
      video.currentTime = state.renderedTime;
    }

    const progress = state.duration ? state.renderedTime / state.duration : 0;
    setOverlayState(progress);
  };

  const shouldLockScroll = () => {
    const frameRect = frame.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    // Lock when video is visible in the viewport and 40px of section scroll have elapsed
    return frameRect.top >= 0 &&
      frameRect.bottom <= window.innerHeight + 40 &&
      sectionRect.top <= -40;
  };

  const syncLockState = () => {
    if (!state.duration) {
      state.isLocked = false;
      return;
    }

    const atStart = state.targetTime <= 0.001;
    const atEnd = state.targetTime >= state.duration - 0.001;

    if (!shouldLockScroll()) {
      state.isLocked = false;
      return;
    }

    if (!atStart && !atEnd) {
      state.isLocked = true;
      return;
    }

    state.isLocked = false;
  };

  const onWheel = (event) => {
    if (!state.duration) {
      return;
    }

    syncLockState();

    if (!state.isLocked) {
      if (shouldLockScroll()) {
        const scrollingDown = event.deltaY > 0;
        const scrollingUp = event.deltaY < 0;
        const atStart = state.targetTime <= 0.001;
        const atEnd = state.targetTime >= state.duration - 0.001;

        if ((scrollingDown && !atEnd) || (scrollingUp && !atStart)) {
          state.isLocked = true;
        }
      }
    }

    if (!state.isLocked) {
      return;
    }

    event.preventDefault();

    const delta = gsap.utils.clamp(-120, 120, event.deltaY);
    const secondsPerStep = state.duration / 18;
    state.targetTime = gsap.utils.clamp(
      0,
      state.duration,
      state.targetTime + (delta / 120) * secondsPerStep
    );

    if (state.targetTime <= 0.001 && event.deltaY < 0) {
      state.isLocked = false;
    }

    if (state.targetTime >= state.duration - 0.001 && event.deltaY > 0) {
      state.isLocked = false;
    }
  };

  const buildScrollVideo = () => {
    const duration = video.duration;

    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    video.pause();
    video.currentTime = 0;
    video.playsInline = true;
    state.duration = Math.max(duration - 0.05, 0);
    state.targetTime = 0;
    state.renderedTime = 0;
    state.isLocked = false;
    state.lastActiveIndex = -1;
    state.lastNoteIndex = -1;

    gsap.set(frame, { transformOrigin: "center center" });
    gsap.set(overlayItems, { autoAlpha: 0.45, y: 0 });
    gsap.set(storyNotes, { autoAlpha: 0.35, y: 40 });
    gsap.set(frame, { scale: 1, borderRadius: 36 });
    setOverlayState(0);
    gsap.ticker.remove(renderVideo);
    gsap.ticker.add(renderVideo);
  };

  if (video.readyState >= 1) {
    buildScrollVideo();
  } else {
    video.addEventListener("loadedmetadata", buildScrollVideo, { once: true });
  }

  video.addEventListener(
    "loadeddata",
    () => {
      video.pause();
    },
    { once: true }
  );

  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("scroll", syncLockState, { passive: true });
  window.addEventListener("resize", syncLockState);
};

setupScrollVideo();
