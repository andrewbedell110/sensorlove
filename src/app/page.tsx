"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

type Stage = "splash" | "profile" | "result" | "cta";

const IDLE_MESSAGES = [
  { emoji: "👀", text: "Come swipe. Nobody will judge." },
  { emoji: "🔥", text: "Would you pass this up?" },
  { emoji: "⏰", text: "This compressor won't wait forever..." },
  { emoji: "💔", text: "Your equipment is more dramatic than your ex." },
  { emoji: "👉", text: "Swipe right on predictive maintenance." },
];

export default function Home() {
  const [stage, setStage] = useState<Stage>("splash");
  const [swipeChoice, setSwipeChoice] = useState<"left" | "right" | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupData, setPopupData] = useState(IDLE_MESSAGES[0]);
  const [popupHiding, setPopupHiding] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [splashArrow, setSplashArrow] = useState<number | null>(null);

  const lastActivity = useRef(Date.now());
  const lastPopupTime = useRef(0);
  const popupIndexRef = useRef(0);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const dragXRef = useRef(0);
  const popupVisibleRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Random arrows pointing to the Start button on splash
  useEffect(() => {
    if (stage !== "splash") {
      setSplashArrow(null);
      return;
    }

    let hideTimeout: ReturnType<typeof setTimeout>;

    const showArrow = () => {
      const pos = Math.floor(Math.random() * 4);
      setSplashArrow(pos);
      hideTimeout = setTimeout(() => setSplashArrow(null), 1800);
    };

    // First arrow after 3s, then every 4s
    const firstDelay = setTimeout(() => {
      showArrow();
    }, 3000);

    const interval = setInterval(showArrow, 4000);

    return () => {
      clearTimeout(firstDelay);
      clearTimeout(hideTimeout);
      clearInterval(interval);
    };
  }, [stage]);

  // Reset activity timer on any interaction
  const resetActivity = useCallback(() => {
    lastActivity.current = Date.now();
    // Dismiss popup on interaction
    if (popupVisibleRef.current) {
      setPopupHiding(true);
      setTimeout(() => {
        popupVisibleRef.current = false;
        setPopupVisible(false);
        setPopupHiding(false);
      }, 300);
    }
  }, []);

  // Try to enter fullscreen
  const enterFullscreen = useCallback(() => {
    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } catch {
      // Fullscreen not supported (e.g. iPad Safari) — no-op
    }
  }, []);

  // Start the experience
  const handleStart = useCallback(() => {
    enterFullscreen();
    resetActivity();
    setStage("profile");
  }, [enterFullscreen, resetActivity]);

  // Handle swipe (from button or touch)
  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      resetActivity();
      setSwipeChoice(direction);

      const targetX = direction === "left" ? -800 : 800;
      const targetRotate = direction === "left" ? -25 : 25;

      requestAnimationFrame(() => {
        setCardStyle({
          transform: `translateX(${targetX}px) rotate(${targetRotate}deg)`,
          opacity: 0,
          transition: "transform 0.45s ease-in, opacity 0.45s ease-in",
        });

        setTimeout(() => {
          setStage("result");
          setCardStyle({});
          setDragX(0);
          dragXRef.current = 0;
        }, 480);
      });
    },
    [resetActivity]
  );

  // Touch handlers for card swiping
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      setIsDragging(true);
      resetActivity();
    },
    [resetActivity]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    dragXRef.current = dx;
    setDragX(dx);
    setCardStyle({
      transform: `translateX(${dx}px) rotate(${dx * 0.05}deg)`,
      transition: "none",
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    const dx = dragXRef.current;

    if (Math.abs(dx) > 80) {
      handleSwipe(dx > 0 ? "right" : "left");
    } else {
      // Spring back
      setCardStyle({
        transform: "translateX(0px) rotate(0deg)",
        transition: "transform 0.3s ease-out",
      });
      setDragX(0);
      dragXRef.current = 0;
      setTimeout(() => setCardStyle({}), 320);
    }
  }, [handleSwipe]);

  // Continue from result to CTA
  const handleContinue = useCallback(() => {
    resetActivity();
    setStage("cta");
  }, [resetActivity]);

  // Restart from CTA to splash
  const handleRestart = useCallback(() => {
    resetActivity();
    setSwipeChoice(null);
    setCardStyle({});
    setDragX(0);
    dragXRef.current = 0;
    setStage("splash");
  }, [resetActivity]);

  // Idle popup timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const idle = now - lastActivity.current;
      const sinceLastPopup = now - lastPopupTime.current;

      if (
        idle >= 15000 &&
        sinceLastPopup >= 15000 &&
        !popupVisibleRef.current &&
        (stage === "splash" || stage === "profile")
      ) {
        lastPopupTime.current = now;
        const msg = IDLE_MESSAGES[popupIndexRef.current % IDLE_MESSAGES.length];
        popupIndexRef.current++;

        setPopupData(msg);
        setPopupHiding(false);
        popupVisibleRef.current = true;
        setPopupVisible(true);

        // Auto-hide after 5 seconds
        setTimeout(() => {
          setPopupHiding(true);
          setTimeout(() => {
            popupVisibleRef.current = false;
            setPopupVisible(false);
            setPopupHiding(false);
          }, 350);
        }, 4650);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [stage]);

  // Auto-restart from CTA after 45 seconds idle
  useEffect(() => {
    if (stage !== "cta") return;
    const timeout = setTimeout(() => {
      handleRestart();
    }, 5000);
    return () => clearTimeout(timeout);
  }, [stage, handleRestart]);

  if (!mounted) return null;

  const isCardActive = Object.keys(cardStyle).length === 0;
  const likeOpacity = Math.min(1, Math.max(0, dragX / 100));
  const nopeOpacity = Math.min(1, Math.max(0, -dragX / 100));

  return (
    <div className="app-container" onClick={resetActivity}>
      {/* Top Banner */}
      <div className="banner">SensorHubb. A data app, not a dating app.</div>

      {/* Ambient floating hearts */}
      <FloatingHearts />

      {/* Main Content */}
      <div className="content">
        {/* ===== SPLASH ===== */}
        {stage === "splash" && (
          <div className="splash">
            <div className="splash-flame">🔥</div>
            <div className="splash-subtitle">
              Find your perfect match&hellip; in predictive maintenance
            </div>
            <div className="splash-btn-wrapper">
              <button className="splash-button" onClick={handleStart}>
                Tap to Start Swiping
              </button>
              {splashArrow !== null && (
                <div className={`splash-arrow splash-arrow-${splashArrow}`}>
                  {["\u2193", "\u2192", "\u2190", "\u2191"][splashArrow]}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== PROFILE CARD ===== */}
        {stage === "profile" && (
          <div className="card-container">
            <div
              className={`profile-card ${isCardActive && !isDragging ? "floating" : ""}`}
              style={!isCardActive ? cardStyle : undefined}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* LIKE / NOPE stamps */}
              <div className="stamp stamp-like" style={{ opacity: likeOpacity }}>
                LIKE
              </div>
              <div className="stamp stamp-nope" style={{ opacity: nopeOpacity }}>
                NOPE
              </div>

              {/* Profile Image */}
              <div className="card-image-wrapper">
                <Image
                  src="/compressor.jpeg"
                  alt="Compressor #22"
                  fill
                  sizes="400px"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                  priority
                />
                <div className="card-image-gradient" />
              </div>

              {/* Profile Info */}
              <div className="card-info">
                <div className="card-name-row">
                  <span className="card-name">Compressor #22</span>
                  <span className="card-age">7</span>
                  <span className="card-verified">✓</span>
                </div>
                <div className="card-location">
                  📍 Walk-in Cooler, Unit 4B &middot; 2 mi away
                </div>
                <div className="card-bio">
                  &ldquo;Still technically working.
                  <br />
                  Just taking longer than I used to.
                  <br />
                  Don&rsquo;t worry about it.&rdquo;
                </div>
                <div className="card-data">
                  <div className="card-data-label">📊 SensorHubb Data Says</div>
                  <div className="card-data-value">Runtime increased 18%</div>
                </div>
                <div className="card-question">What do you do?</div>
              </div>
            </div>

            {/* Swipe Buttons */}
            <div className="action-buttons">
              <div className="action-btn-wrapper">
                <button
                  className="action-btn btn-nope"
                  onClick={() => handleSwipe("left")}
                >
                  ✕
                </button>
                <div className="btn-label" style={{ color: "#FF4458" }}>
                  Ignore
                </div>
              </div>
              <div className="action-btn-wrapper">
                <button
                  className="action-btn btn-like"
                  onClick={() => handleSwipe("right")}
                >
                  ♥
                </button>
                <div className="btn-label" style={{ color: "#00D387" }}>
                  Investigate
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== RESULT: SWIPED LEFT (BAD) ===== */}
        {stage === "result" && swipeChoice === "left" && (
          <div className="result-screen result-bad">
            <div className="result-icon">💔</div>
            <div className="result-heading">Uh oh.</div>
            <div className="result-subtext">
              Three days later: equipment failure.
            </div>
            <div className="result-cost">Estimated cost: $8,400</div>
            <button className="continue-btn" onClick={handleContinue}>
              See What Happens Next →
            </button>
          </div>
        )}

        {/* ===== RESULT: SWIPED RIGHT (GOOD) ===== */}
        {stage === "result" && swipeChoice === "right" && (
          <div className="result-screen result-good">
            <div className="result-icon">✅</div>
            <div className="result-heading">Good instincts.</div>
            <div className="result-subtext">
              Maintenance identified the issue before failure.
            </div>
            <div className="result-cost">Estimated savings: $8,400</div>
            <button className="continue-btn" onClick={handleContinue}>
              See What Happens Next →
            </button>
          </div>
        )}

        {/* ===== CTA SCREEN ===== */}
        {stage === "cta" && (
          <div className="cta-screen">
            <div className="cta-heartbreak">💘</div>
            <div className="cta-tagline">
              Don&rsquo;t wait for equipment to break up with you.
            </div>
            <div className="cta-logo-text">
              <span className="cta-logo-sensor">Sensor</span>
              <span className="cta-logo-hubb">Hubb</span>
            </div>
            <div className="cta-motto">Predict. Prevent. Protect.</div>
            <button className="restart-btn" onClick={handleRestart}>
              Swipe Again
            </button>
          </div>
        )}
      </div>

      {/* ===== IDLE POPUP ===== */}
      {popupVisible && (
        <div className={`idle-popup ${popupHiding ? "hiding" : ""}`}>
          <span className="idle-popup-emoji">{popupData.emoji}</span>
          {popupData.text}
        </div>
      )}
    </div>
  );
}

/** Ambient floating hearts in the background */
function FloatingHearts() {
  const hearts = [
    { left: "8%", delay: "0s", duration: "14s", size: "14px" },
    { left: "20%", delay: "2s", duration: "11s", size: "18px" },
    { left: "35%", delay: "5s", duration: "16s", size: "12px" },
    { left: "50%", delay: "1s", duration: "13s", size: "20px" },
    { left: "65%", delay: "4s", duration: "15s", size: "14px" },
    { left: "78%", delay: "7s", duration: "12s", size: "16px" },
    { left: "90%", delay: "3s", duration: "17s", size: "13px" },
    { left: "45%", delay: "9s", duration: "14s", size: "11px" },
  ];

  return (
    <div className="hearts-bg">
      {hearts.map((h, i) => (
        <span
          key={i}
          className="heart-particle"
          style={{
            left: h.left,
            animationDelay: h.delay,
            animationDuration: h.duration,
            fontSize: h.size,
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}
