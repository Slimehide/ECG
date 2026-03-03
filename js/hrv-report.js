/* ============================================================
   HRV Analysis Report – Auto-generated on page load
   Humanized physiological simulation
   ============================================================ */

(function () {
  'use strict';

  // ─── Date ──────────────────────────────────────────────────
  var now = new Date();
  document.getElementById('sessionDate').textContent =
    now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('navTimestamp').textContent =
    now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // ─── Background Electric Signals ───────────────────────────
  var bgCanvas = document.getElementById('bgCanvas');
  var bgCtx = bgCanvas.getContext('2d');
  var bgW, bgH;

  function resizeBg() {
    bgW = bgCanvas.width = window.innerWidth;
    bgH = bgCanvas.height = window.innerHeight;
  }
  resizeBg();
  window.addEventListener('resize', resizeBg);

  var streams = [];
  var NUM_STREAMS = 8;

  function createStream() {
    var isH = Math.random() > 0.3;
    return {
      x: isH ? -80 : Math.random() * bgW,
      y: isH ? Math.random() * bgH : -80,
      speed: 1 + Math.random() * 2.5,
      horizontal: isH,
      segments: [],
      maxSegments: 50 + Math.floor(Math.random() * 30),
      hue: Math.random() > 0.5 ? 12 : 25,
      opacity: 0.1 + Math.random() * 0.2,
      width: 0.8 + Math.random() * 1.2,
      jitter: 1.5 + Math.random() * 3,
    };
  }

  for (var i = 0; i < NUM_STREAMS; i++) {
    var s = createStream();
    if (s.horizontal) s.x = Math.random() * bgW;
    else s.y = Math.random() * bgH;
    streams.push(s);
  }

  function animateBg() {
    bgCtx.clearRect(0, 0, bgW, bgH);
    for (var i = 0; i < streams.length; i++) {
      var s = streams[i];
      if (s.horizontal) {
        s.x += s.speed;
        s.segments.push({ x: s.x, y: s.y + (Math.random() - 0.5) * s.jitter });
      } else {
        s.y += s.speed;
        s.segments.push({ x: s.x + (Math.random() - 0.5) * s.jitter, y: s.y });
      }
      if (s.segments.length > s.maxSegments) s.segments.shift();

      if (s.segments.length > 1) {
        bgCtx.beginPath();
        bgCtx.moveTo(s.segments[0].x, s.segments[0].y);
        for (var j = 1; j < s.segments.length; j++) bgCtx.lineTo(s.segments[j].x, s.segments[j].y);
        bgCtx.strokeStyle = 'hsla(' + s.hue + ', 90%, 50%, ' + s.opacity + ')';
        bgCtx.lineWidth = s.width;
        bgCtx.lineCap = 'round';
        bgCtx.lineJoin = 'round';
        bgCtx.stroke();

        var head = s.segments[s.segments.length - 1];
        var g = bgCtx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 10);
        g.addColorStop(0, 'hsla(' + s.hue + ', 100%, 60%, ' + s.opacity * 1.3 + ')');
        g.addColorStop(1, 'hsla(' + s.hue + ', 100%, 50%, 0)');
        bgCtx.beginPath();
        bgCtx.arc(head.x, head.y, 10, 0, Math.PI * 2);
        bgCtx.fillStyle = g;
        bgCtx.fill();
      }

      if ((s.horizontal && s.x > bgW + 150) || (!s.horizontal && s.y > bgH + 150)) {
        streams[i] = createStream();
      }
    }
    requestAnimationFrame(animateBg);
  }
  requestAnimationFrame(animateBg);

  // ─── Humanized RR Interval Generation ─────────────────────
  // Simulate realistic RR intervals with respiratory sinus arrhythmia
  function generateRRIntervals(count) {
    var rr = [];
    var baseRR = 780 + Math.random() * 80; // base around 780-860ms (70-77 bpm)
    var breathCycle = 12 + Math.random() * 8; // breathing cycle length in beats
    var breathAmp = 20 + Math.random() * 25; // RSA amplitude
    var wanderPhase = Math.random() * Math.PI * 2;

    for (var i = 0; i < count; i++) {
      // Respiratory sinus arrhythmia
      var rsa = breathAmp * Math.sin(2 * Math.PI * i / breathCycle + wanderPhase);

      // Slow baseline drift (like posture shifts, stress changes)
      var drift = 15 * Math.sin(2 * Math.PI * i / (count * 0.7));

      // Beat-to-beat noise (small, realistic)
      var noise = (Math.random() - 0.5) * 12;

      // Occasional slightly different beat (not a full ectopic, just variation)
      var occasional = 0;
      if (Math.random() < 0.03) {
        occasional = (Math.random() - 0.5) * 40;
      }

      var interval = baseRR + rsa + drift + noise + occasional;
      interval = Math.max(620, Math.min(1050, interval));
      rr.push(interval);
    }
    return rr;
  }

  function calcSDNN(rr) {
    var mean = rr.reduce(function (a, b) { return a + b; }, 0) / rr.length;
    var variance = rr.reduce(function (s, v) { return s + Math.pow(v - mean, 2); }, 0) / rr.length;
    return Math.sqrt(variance);
  }

  function calcRMSSD(rr) {
    var sum = 0;
    for (var i = 1; i < rr.length; i++) sum += Math.pow(rr[i] - rr[i - 1], 2);
    return Math.sqrt(sum / (rr.length - 1));
  }

  // ─── Canvas Utilities ─────────────────────────────────────
  function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: rect.width, h: rect.height };
  }

  // ─── RR Tachogram ─────────────────────────────────────────
  function drawRRTachogram(rr) {
    var canvas = document.getElementById('rrCanvas');
    var setup = setupCanvas(canvas);
    var ctx = setup.ctx, w = setup.w, h = setup.h;
    var pad = { t: 20, r: 16, b: 30, l: 44 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;

    ctx.clearRect(0, 0, w, h);

    var minRR = Math.min.apply(null, rr);
    var maxRR = Math.max.apply(null, rr);
    var range = maxRR - minRR || 1;

    // Grid
    ctx.strokeStyle = 'rgba(30,58,95,0.4)';
    ctx.lineWidth = 0.5;
    for (var i = 0; i <= 4; i++) {
      var y = pad.t + (i / 4) * ph;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + pw, y);
      ctx.stroke();

      ctx.fillStyle = '#8899aa';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxRR - (i / 4) * range) + '', pad.l - 6, y + 4);
    }

    ctx.fillStyle = '#8899aa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Beat number', pad.l + pw / 2, h - 4);

    // Line
    ctx.beginPath();
    for (var j = 0; j < rr.length; j++) {
      var x = pad.l + (j / (rr.length - 1)) * pw;
      var ly = pad.t + ph - ((rr[j] - minRR) / range) * ph;
      if (j === 0) ctx.moveTo(x, ly);
      else ctx.lineTo(x, ly);
    }
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill under
    ctx.lineTo(pad.l + pw, pad.t + ph);
    ctx.lineTo(pad.l, pad.t + ph);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ph);
    grad.addColorStop(0, 'rgba(79,195,247,0.15)');
    grad.addColorStop(1, 'rgba(79,195,247,0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // ─── Poincaré Plot ─────────────────────────────────────────
  function drawPoincare(rr) {
    var canvas = document.getElementById('poincareCanvas');
    var setup = setupCanvas(canvas);
    var ctx = setup.ctx, w = setup.w, h = setup.h;
    var pad = { t: 20, r: 16, b: 30, l: 44 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;

    ctx.clearRect(0, 0, w, h);

    var minV = Math.min.apply(null, rr) - 10;
    var maxV = Math.max.apply(null, rr) + 10;
    var range = maxV - minV;

    // Grid
    ctx.strokeStyle = 'rgba(30,58,95,0.4)';
    ctx.lineWidth = 0.5;
    for (var i = 0; i <= 4; i++) {
      var y = pad.t + (i / 4) * ph;
      var x = pad.l + (i / 4) * pw;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + pw, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ph); ctx.stroke();
    }

    // Identity line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + ph);
    ctx.lineTo(pad.l + pw, pad.t);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#8899aa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RR(n) ms', pad.l + pw / 2, h - 4);

    // Save context for clipping to avoid drawing outside
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t, pw, ph);
    ctx.clip();

    // Points with slight alpha variation for density feel
    for (var j = 0; j < rr.length - 1; j++) {
      var px = pad.l + ((rr[j] - minV) / range) * pw;
      var py = pad.t + ph - ((rr[j + 1] - minV) / range) * ph;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(46,204,64,' + (0.4 + Math.random() * 0.3) + ')';
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── PSD Chart ─────────────────────────────────────────────
  function drawPSD(lfPower, hfPower) {
    var canvas = document.getElementById('psdCanvas');
    var setup = setupCanvas(canvas);
    var ctx = setup.ctx, w = setup.w, h = setup.h;
    var pad = { t: 20, r: 16, b: 30, l: 44 };
    var pw = w - pad.l - pad.r;
    var ph = h - pad.t - pad.b;

    ctx.clearRect(0, 0, w, h);

    // Generate PSD with amplitudes tied to actual LF/HF values
    var lfScale = lfPower / 1000;
    var hfScale = hfPower / 700;
    var freqs = [];
    var powers = [];
    for (var f = 0; f <= 0.5; f += 0.002) {
      freqs.push(f);
      var p = (200 * lfScale) * Math.exp(-Math.pow((f - 0.10) / 0.04, 2))
            + (140 * hfScale) * Math.exp(-Math.pow((f - 0.25) / 0.06, 2))
            + 20 * Math.exp(-f * 8)
            + Math.random() * 5;
      powers.push(p);
    }

    var maxP = Math.max.apply(null, powers);

    // Grid
    ctx.strokeStyle = 'rgba(30,58,95,0.4)';
    ctx.lineWidth = 0.5;
    for (var gi = 0; gi <= 5; gi++) {
      var gy = pad.t + (gi / 5) * ph;
      ctx.beginPath();
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(pad.l + pw, gy);
      ctx.stroke();
    }

    // LF region fill
    ctx.beginPath();
    var lfStart = 0.04, lfEnd = 0.15;
    var startedLF = false;
    for (var li = 0; li < freqs.length; li++) {
      if (freqs[li] >= lfStart && freqs[li] <= lfEnd) {
        var lx = pad.l + (freqs[li] / 0.5) * pw;
        var ly = pad.t + ph - (powers[li] / maxP) * ph;
        if (!startedLF) { ctx.moveTo(lx, pad.t + ph); startedLF = true; }
        ctx.lineTo(lx, ly);
      }
    }
    ctx.lineTo(pad.l + (lfEnd / 0.5) * pw, pad.t + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,152,0,0.2)';
    ctx.fill();

    // HF region fill
    ctx.beginPath();
    var hfStart = 0.15, hfEnd = 0.4;
    var startedHF = false;
    for (var hi = 0; hi < freqs.length; hi++) {
      if (freqs[hi] >= hfStart && freqs[hi] <= hfEnd) {
        var hx = pad.l + (freqs[hi] / 0.5) * pw;
        var hy = pad.t + ph - (powers[hi] / maxP) * ph;
        if (!startedHF) { ctx.moveTo(hx, pad.t + ph); startedHF = true; }
        ctx.lineTo(hx, hy);
      }
    }
    ctx.lineTo(pad.l + (hfEnd / 0.5) * pw, pad.t + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(229,57,53,0.2)';
    ctx.fill();

    // PSD line
    ctx.beginPath();
    for (var pi = 0; pi < freqs.length; pi++) {
      var px = pad.l + (freqs[pi] / 0.5) * pw;
      var py = pad.t + ph - (powers[pi] / maxP) * ph;
      if (pi === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Frequency labels
    ctx.fillStyle = '#8899aa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (var fl = 0; fl <= 0.5; fl += 0.1) {
      var fx = pad.l + (fl / 0.5) * pw;
      ctx.fillText(fl.toFixed(1), fx, pad.t + ph + 16);
    }
    ctx.fillText('Frequency (Hz)', pad.l + pw / 2, h - 2);

    // Legend
    ctx.fillStyle = 'rgba(255,152,0,0.6)';
    ctx.fillRect(pad.l + pw - 120, pad.t + 4, 10, 10);
    ctx.fillStyle = '#8899aa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LF', pad.l + pw - 106, pad.t + 13);

    ctx.fillStyle = 'rgba(229,57,53,0.6)';
    ctx.fillRect(pad.l + pw - 70, pad.t + 4, 10, 10);
    ctx.fillStyle = '#8899aa';
    ctx.fillText('HF', pad.l + pw - 56, pad.t + 13);
  }

  // ─── Generate everything on load ──────────────────────────
  var rr = generateRRIntervals(300);
  var sdnn = calcSDNN(rr);
  var rmssd = calcRMSSD(rr);
  var avgRR = rr.reduce(function (a, b) { return a + b; }, 0) / rr.length;
  var avgHR = Math.round(60000 / avgRR);

  // LF and HF power derived from the actual data characteristics
  // (in a real system this would be FFT; here we approximate from SDNN/RMSSD)
  var lfPower = Math.round(sdnn * sdnn * 0.4 + 200 + Math.random() * 150);
  var hfPower = Math.round(rmssd * rmssd * 0.3 + 100 + Math.random() * 100);
  var ratio = (lfPower / hfPower).toFixed(2);

  // Populate summary cards
  document.getElementById('sdnnVal').textContent = sdnn.toFixed(1);
  document.getElementById('rmssdVal').textContent = rmssd.toFixed(1);
  document.getElementById('lfVal').textContent = lfPower;
  document.getElementById('hfVal').textContent = hfPower;
  document.getElementById('ratioVal').textContent = ratio;
  document.getElementById('avgHrVal').textContent = avgHR;

  // ─── Check normal ranges and flag abnormals ───────────────
  // Normal ranges for healthy adult at rest
  var ranges = {
    sdnn:  { min: 50,  max: 150,  cardId: 'sdnnCard' },
    rmssd: { min: 20,  max: 75,   cardId: 'rmssdCard' },
    lf:    { min: 400, max: 1750, cardId: 'lfCard' },
    hf:    { min: 150, max: 1000, cardId: 'hfCard' },
    ratio: { min: 0.5, max: 2.0,  cardId: 'ratioCard' },
    avgHr: { min: 60,  max: 100,  cardId: 'avgHrCard' },
  };

  function flagIfAbnormal(value, range) {
    var card = document.getElementById(range.cardId);
    if (value < range.min || value > range.max) {
      card.classList.add('abnormal');
      return true;
    }
    return false;
  }

  var sdnnAbnormal  = flagIfAbnormal(sdnn, ranges.sdnn);
  var rmssdAbnormal = flagIfAbnormal(rmssd, ranges.rmssd);
  var lfAbnormal    = flagIfAbnormal(lfPower, ranges.lf);
  var hfAbnormal    = flagIfAbnormal(hfPower, ranges.hf);
  var ratioAbnormal = flagIfAbnormal(parseFloat(ratio), ranges.ratio);
  var hrAbnormal    = flagIfAbnormal(avgHR, ranges.avgHr);

  // Draw charts
  drawRRTachogram(rr);
  drawPoincare(rr);
  drawPSD(lfPower, hfPower);

  // Clinical summary
  var body = document.getElementById('reportBody');
  var lfHfComment = parseFloat(ratio) > 2.0
    ? '<span class="warning">elevated sympathetic dominance</span>'
    : parseFloat(ratio) < 0.5
    ? '<span class="warning">elevated parasympathetic dominance</span>'
    : '<span class="metric-highlight">balanced autonomic activity</span>';

  var sdnnClass = sdnnAbnormal ? 'warning' : 'metric-highlight';
  var rmssdClass = rmssdAbnormal ? 'warning' : 'metric-highlight';
  var lfClass = lfAbnormal ? 'warning' : 'metric-highlight';
  var hfClass = hfAbnormal ? 'warning' : 'metric-highlight';
  var ratioClass = ratioAbnormal ? 'warning' : 'metric-highlight';
  var hrClass = hrAbnormal ? 'warning' : 'metric-highlight';

  body.innerHTML =
    '<h4>Time Domain Analysis</h4>' +
    '<p>The SDNN of <span class="' + sdnnClass + '">' + sdnn.toFixed(1) + ' ms</span> indicates ' +
    (sdnnAbnormal ? '<span class="warning">abnormal</span>' : 'normal') + ' overall HRV, reflecting ' +
    (sdnnAbnormal ? 'potentially compromised' : 'adequate') + ' autonomic function. ' +
    'RMSSD measured at <span class="' + rmssdClass + '">' + rmssd.toFixed(1) + ' ms</span>, suggesting ' +
    (rmssdAbnormal ? '<span class="warning">diminished</span>' : 'healthy') + ' parasympathetic (vagal) tone.</p>' +
    '<h4>Frequency Domain Analysis</h4>' +
    '<p>LF power: <span class="' + lfClass + '">' + lfPower + ' ms&sup2;</span>' +
    (lfAbnormal ? ' <span class="warning">(outside normal range 400–1750)</span>' : '') + '. ' +
    'HF power: <span class="' + hfClass + '">' + hfPower + ' ms&sup2;</span>' +
    (hfAbnormal ? ' <span class="warning">(outside normal range 150–1000)</span>' : '') + '. ' +
    'The LF/HF ratio of <span class="' + ratioClass + '">' + ratio + '</span> indicates ' + lfHfComment + '.</p>' +
    '<h4>Non-Linear Analysis</h4>' +
    '<p>The Poincar&eacute; plot displays ' + (sdnn > 40 ? 'a healthy spread' : '<span class="warning">reduced variability</span>') +
    ' of RR intervals, consistent with the time-domain findings. The ellipse shape suggests ' +
    (rmssd > 20 ? 'normal' : '<span class="warning">reduced</span>') + ' short-term variability.</p>' +
    '<h4>Summary</h4>' +
    '<p>Overall, this recording demonstrates ' +
    (!sdnnAbnormal && !rmssdAbnormal && !ratioAbnormal
      ? '<span class="metric-highlight">normal HRV parameters</span>'
      : '<span class="warning">one or more metrics outside normal ranges — clinical review recommended</span>') +
    '. Average heart rate of <span class="' + hrClass + '">' + avgHR + ' bpm</span> is ' +
    (hrAbnormal ? '<span class="warning">outside normal resting range (60–100 bpm)</span>' : 'within normal resting range') + '.</p>';

  // Handle resize
  window.addEventListener('resize', function () {
    drawRRTachogram(rr);
    drawPoincare(rr);
    drawPSD(lfPower, hfPower);
  });
})();
