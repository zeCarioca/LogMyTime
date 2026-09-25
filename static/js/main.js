// Timer, Stepper, and Dashboard UI Controls

document.addEventListener('DOMContentLoaded', () => {
  // 1. Quick Minute Buttons (+15m, +30m, +60m)
  document.querySelectorAll('.quick-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const minInput = document.getElementById('duration_minutes');
      const secInput = document.getElementById('duration_secs_input');
      const totalHidden = document.getElementById('duration_seconds');
      const addedMins = parseInt(pill.dataset.minutes) || 0;

      const currentMins = parseInt(minInput.value) || 0;
      const currentSecs = parseInt(secInput.value) || 0;
      const newMins = currentMins + addedMins;

      minInput.value = newMins;
      totalHidden.value = (newMins * 60) + currentSecs;
    });
  });

  // 2. Manual Input Sync to Hidden duration_seconds
  const durationMinInput = document.getElementById('duration_minutes');
  const durationSecInput = document.getElementById('duration_secs_input');
  const durationSecondsHidden = document.getElementById('duration_seconds');

  function syncManualDuration() {
    const m = parseInt(durationMinInput.value) || 0;
    const s = parseInt(durationSecInput.value) || 0;
    durationSecondsHidden.value = (m * 60) + s;
  }

  if (durationMinInput && durationSecInput) {
    durationMinInput.addEventListener('input', syncManualDuration);
    durationSecInput.addEventListener('input', syncManualDuration);
  }

  // 3. Circular Timer Engine
  let timerState = 'idle'; // 'idle', 'running', 'paused'
  let timerElapsedSeconds = 0;
  let timerInterval = null;

  const timerButton = document.getElementById('timerButton');
  const timeDisplay = document.getElementById('timeDisplay');
  const timerStatus = document.getElementById('timerStatus');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const timerProgress = document.getElementById('timerProgress');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const autoAppliedHint = document.getElementById('autoAppliedHint');
  const autoAppliedText = document.getElementById('autoAppliedText');
  const timerSvg = document.getElementById('timerSvg');
  const actionIcon = document.getElementById('actionIcon');

  const CIRCUMFERENCE = 2 * Math.PI * 130; // approx 816.8
  if (timerProgress) {
    timerProgress.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    timerProgress.style.strokeDashoffset = '0';
  }

  function formatTime(totalSecs) {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  const HOUR_SECONDS = 3600;
  const STAGE_CONFIGS = [
    {
      gradient: 'url(#timerGradientQ1)',
      glow: 'drop-shadow(0 0 16px rgba(99, 102, 241, 0.45))',
      btnGlow: '0 0 35px rgba(99, 102, 241, 0.35), inset 0 0 20px rgba(99, 102, 241, 0.2)',
      borderColor: 'rgba(129, 140, 248, 0.6)',
      iconBg: 'linear-gradient(135deg, #06b6d4, #6366f1)'
    },
    {
      gradient: 'url(#timerGradientQ2)',
      glow: 'drop-shadow(0 0 18px rgba(245, 158, 11, 0.5))',
      btnGlow: '0 0 35px rgba(245, 158, 11, 0.35), inset 0 0 20px rgba(245, 158, 11, 0.2)',
      borderColor: 'rgba(251, 191, 36, 0.7)',
      iconBg: 'linear-gradient(135deg, #10b981, #f59e0b)'
    },
    {
      gradient: 'url(#timerGradientQ3)',
      glow: 'drop-shadow(0 0 20px rgba(249, 115, 22, 0.6))',
      btnGlow: '0 0 40px rgba(249, 115, 22, 0.4), inset 0 0 22px rgba(249, 115, 22, 0.25)',
      borderColor: 'rgba(249, 115, 22, 0.75)',
      iconBg: 'linear-gradient(135deg, #f59e0b, #f97316)'
    },
    {
      gradient: 'url(#timerGradientQ4)',
      glow: 'drop-shadow(0 0 24px rgba(239, 68, 68, 0.75))',
      btnGlow: '0 0 45px rgba(239, 68, 68, 0.5), inset 0 0 25px rgba(239, 68, 68, 0.3)',
      borderColor: 'rgba(239, 68, 68, 0.9)',
      iconBg: 'linear-gradient(135deg, #f43f5e, #ef4444)'
    }
  ];

  function updateProgressRing() {
    if (!timerProgress) return;
    const secondsInCurrentHour = timerElapsedSeconds % HOUR_SECONDS;
    const progressFraction = timerElapsedSeconds === 0 ? 0 : (secondsInCurrentHour === 0 ? 1 : secondsInCurrentHour / HOUR_SECONDS);
    const offset = CIRCUMFERENCE - (progressFraction * CIRCUMFERENCE);
    timerProgress.style.strokeDashoffset = offset;

    const quarterIndex = Math.min(3, Math.floor(secondsInCurrentHour / 900));
    const config = STAGE_CONFIGS[quarterIndex];

    timerProgress.style.stroke = config.gradient;
    if (timerSvg) timerSvg.style.filter = config.glow;
    if (timerButton && timerState === 'running') {
      timerButton.style.boxShadow = config.btnGlow;
      timerButton.style.borderColor = config.borderColor;
    }
    if (actionIcon) actionIcon.style.background = config.iconBg;
  }

  function autoApplyToDuration(totalSecs) {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;

    if (durationMinInput) durationMinInput.value = mins;
    if (durationSecInput) durationSecInput.value = secs;
    if (durationSecondsHidden) durationSecondsHidden.value = totalSecs;

    if (autoAppliedHint && autoAppliedText) {
      autoAppliedText.innerText = 'Time applied to duration';
      autoAppliedHint.style.display = totalSecs > 0 ? 'flex' : 'none';
    }
  }

  function startTimer() {
    timerState = 'running';
    if (timerButton) {
      timerButton.classList.add('active');
      timerButton.classList.remove('paused');
    }
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
    if (timerStatus) timerStatus.innerText = 'Tracking...';

    if (pauseBtn) pauseBtn.disabled = false;
    if (resumeBtn) resumeBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    timerInterval = setInterval(() => {
      timerElapsedSeconds++;
      if (timeDisplay) timeDisplay.innerText = formatTime(timerElapsedSeconds);
      updateProgressRing();
    }, 1000);
  }

  function pauseTimer() {
    if (timerState !== 'running') return;
    clearInterval(timerInterval);
    timerState = 'paused';

    if (timerButton) {
      timerButton.classList.remove('active');
      timerButton.classList.add('paused');
      timerButton.style.boxShadow = '';
      timerButton.style.borderColor = '';
    }
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (timerStatus) timerStatus.innerText = 'Paused';

    autoApplyToDuration(timerElapsedSeconds);

    if (pauseBtn) pauseBtn.disabled = true;
    if (resumeBtn) resumeBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;
  }

  function resumeTimer() {
    if (timerState !== 'paused') return;
    startTimer();
  }

  // 4. Reset Confirmation Modal
  const resetModal = document.getElementById('resetModal');
  const cancelResetBtn = document.getElementById('cancelResetBtn');
  const confirmResetBtn = document.getElementById('confirmResetBtn');

  function showResetModal() {
    if (resetModal) {
      if (timerState === 'running') pauseTimer();
      resetModal.classList.add('show');
    }
  }

  function hideResetModal() {
    if (resetModal) resetModal.classList.remove('show');
  }

  function resetCurrentTimer() {
    clearInterval(timerInterval);
    timerState = 'idle';
    timerElapsedSeconds = 0;

    if (timeDisplay) timeDisplay.innerText = '00:00:00';
    if (timerProgress) {
      timerProgress.style.strokeDashoffset = CIRCUMFERENCE;
      timerProgress.style.stroke = 'url(#timerGradientQ1)';
    }
    if (timerSvg) timerSvg.style.filter = STAGE_CONFIGS[0].glow;
    if (actionIcon) actionIcon.style.background = STAGE_CONFIGS[0].iconBg;

    if (timerButton) {
      timerButton.classList.remove('active', 'paused');
      timerButton.style.boxShadow = '';
      timerButton.style.borderColor = '';
    }
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    if (timerStatus) timerStatus.innerText = 'Click to Start';

    if (pauseBtn) pauseBtn.disabled = true;
    if (resumeBtn) resumeBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = true;

    if (durationMinInput) durationMinInput.value = 0;
    if (durationSecInput) durationSecInput.value = 0;
    if (durationSecondsHidden) durationSecondsHidden.value = 0;
    if (autoAppliedHint) autoAppliedHint.style.display = 'none';

    hideResetModal();
  }

  function stopTimer() {
    if (timerElapsedSeconds > 0 || timerState !== 'idle') {
      showResetModal();
    }
  }

  if (cancelResetBtn) cancelResetBtn.addEventListener('click', hideResetModal);
  if (confirmResetBtn) confirmResetBtn.addEventListener('click', resetCurrentTimer);
  if (resetModal) {
    resetModal.addEventListener('click', (e) => {
      if (e.target === resetModal) hideResetModal();
    });
  }

  if (timerButton) {
    timerButton.addEventListener('click', () => {
      if (timerState === 'idle') startTimer();
      else if (timerState === 'running') pauseTimer();
      else if (timerState === 'paused') resumeTimer();
    });
  }

  if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
  if (resumeBtn) resumeBtn.addEventListener('click', resumeTimer);
  if (stopBtn) stopBtn.addEventListener('click', stopTimer);

  // 5. Manual Sync Buttons via GitHub API
  document.querySelectorAll('.btn-manual-sync').forEach(btn => {
    btn.addEventListener('click', async () => {
      const repoId = btn.dataset.repoId;
      btn.innerText = 'Syncing...';
      btn.disabled = true;

      try {
        const res = await fetch(`/api/sync-manual/${repoId}`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Sync failed: ' + (data.message || 'Unknown error'));
          btn.innerText = 'Sync Now';
          btn.disabled = false;
        }
      } catch (err) {
        alert('Network error during sync');
        btn.innerText = 'Sync Now';
        btn.disabled = false;
      }
    });
  });

  // 6. Collapsible Archive Panel Toggle
  const archiveToggleBtn = document.getElementById('archiveToggleBtn');
  const archiveContent = document.getElementById('archiveContent');
  const archiveChevron = document.getElementById('archiveChevron');

  if (archiveToggleBtn && archiveContent) {
    archiveToggleBtn.addEventListener('click', () => {
      const isCollapsed = archiveContent.style.display === 'none' || archiveContent.style.display === '';
      if (isCollapsed) {
        archiveContent.style.display = 'block';
        archiveToggleBtn.setAttribute('aria-expanded', 'true');
        if (archiveChevron) archiveChevron.style.transform = 'rotate(180deg)';
      } else {
        archiveContent.style.display = 'none';
        archiveToggleBtn.setAttribute('aria-expanded', 'false');
        if (archiveChevron) archiveChevron.style.transform = 'rotate(0deg)';
      }
    });
  }
});
