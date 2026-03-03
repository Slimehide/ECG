/* ============================================================
   ECG Monitor Dashboard – Main Application
   Humanized physiological simulation
   ============================================================ */

(function () {
  'use strict';

  // ─── Utility: smooth random walk (Ornstein-Uhlenbeck) ─────
  function createDrift(initial, min, max, inertia) {
    var value = initial;
    var velocity = 0;
    return function () {
      var mean = (min + max) / 2;
      var pull = (mean - value) * 0.02;
      var noise = (Math.random() - 0.5) * inertia;
      velocity = velocity * 0.85 + pull + noise;
      value += velocity;
      value = Math.max(min, Math.min(max, value));
      return value;
    };
  }

  // ─── Theme System ────────────────────────────────────────
  function isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function getThemeColors() {
    if (isDarkMode()) {
      return {
        gridMajor: 'rgba(255,255,255,0.12)',
        gridMinor: 'rgba(255,255,255,0.05)',
        separator: 'rgba(255,255,255,0.15)',
        axisText: '#94a3b8',
        leadColors: {
          'I':   '#ef5350',   // red
          'II':  '#2ecc40',   // green
          'III': '#fdd835',   // yellow
          'aVR': '#ef5350',   // red
          'aVL': '#2ecc40',   // green
          'aVF': '#fdd835'    // yellow
        },
        leadShadows: {
          'I':   'rgba(239, 83, 80, 0.45)',
          'II':  'rgba(46, 204, 64, 0.55)',
          'III': 'rgba(253, 216, 53, 0.45)',
          'aVR': 'rgba(239, 83, 80, 0.45)',
          'aVL': 'rgba(46, 204, 64, 0.45)',
          'aVF': 'rgba(253, 216, 53, 0.45)'
        },
        streamSat: 70,
        streamLight: 55,
        streamOpacityMul: 0.5,
        sparkleSat: 75,
        sparkleLight: 60
      };
    }
    return {
      gridMajor: 'rgba(0,0,0,0.1)',
      gridMinor: 'rgba(0,0,0,0.05)',
      separator: 'rgba(0,0,0,0.12)',
      axisText: '#64748b',
      leadColors: {
        'I':   '#0277bd',
        'II':  '#0277bd',
        'III': '#0277bd',
        'aVR': '#e65100',
        'aVL': '#7b1fa2',
        'aVF': '#2e7d32'
      },
      leadShadows: {
        'I':   'rgba(2, 119, 189, 0.35)',
        'II':  'rgba(2, 119, 189, 0.45)',
        'III': 'rgba(2, 119, 189, 0.35)',
        'aVR': 'rgba(230, 81, 0, 0.35)',
        'aVL': 'rgba(123, 31, 162, 0.35)',
        'aVF': 'rgba(46, 125, 50, 0.35)'
      },
      streamSat: 80,
      streamLight: 45,
      streamOpacityMul: 0.7,
      sparkleSat: 85,
      sparkleLight: 50
    };
  }

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

  var NUM_STREAMS = 22;
  var streams = [];

  function createStream() {
    var isHorizontal = Math.random() > 0.3;
    return {
      x: isHorizontal ? -100 : Math.random() * bgW,
      y: isHorizontal ? Math.random() * bgH : -100,
      speed: 1.5 + Math.random() * 3,
      horizontal: isHorizontal,
      segments: [],
      maxSegments: 60 + Math.floor(Math.random() * 40),
      hue: Math.random() > 0.5 ? 12 : 25,
      opacity: 0.15 + Math.random() * 0.25,
      width: 1 + Math.random() * 1.5,
      jitter: 2 + Math.random() * 4,
    };
  }

  for (var si = 0; si < NUM_STREAMS; si++) {
    var st = createStream();
    if (st.horizontal) st.x = Math.random() * bgW * 1.5 - bgW * 0.25;
    else st.y = Math.random() * bgH * 1.5 - bgH * 0.25;
    streams.push(st);
  }

  // ─── Sparkle Particles ────────────────────────────────────
  var NUM_SPARKLES = 35;
  var sparkles = [];

  function createSparkle() {
    return {
      x: Math.random() * bgW,
      y: Math.random() * bgH,
      size: 0.8 + Math.random() * 2,
      life: 0,
      maxLife: 80 + Math.floor(Math.random() * 140),
      hue: Math.random() > 0.4 ? 12 : 25,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      trail: [],
      maxTrail: 6 + Math.floor(Math.random() * 8),
    };
  }

  for (var sp = 0; sp < NUM_SPARKLES; sp++) {
    var sparkle = createSparkle();
    sparkle.life = Math.floor(Math.random() * sparkle.maxLife);
    sparkles.push(sparkle);
  }

  function updateBgStreams() {
    var tc = getThemeColors();
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
        bgCtx.strokeStyle = 'hsla(' + s.hue + ', ' + tc.streamSat + '%, ' + tc.streamLight + '%, ' + (s.opacity * tc.streamOpacityMul) + ')';
        bgCtx.lineWidth = s.width;
        bgCtx.lineCap = 'round';
        bgCtx.lineJoin = 'round';
        bgCtx.stroke();
        var head = s.segments[s.segments.length - 1];
        bgCtx.beginPath();
        bgCtx.arc(head.x, head.y, 12, 0, Math.PI * 2);
        var grad = bgCtx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 12);
        grad.addColorStop(0, 'hsla(' + s.hue + ', 90%, ' + (tc.sparkleLight + 5) + '%, ' + (s.opacity * 1.2) + ')');
        grad.addColorStop(1, 'hsla(' + s.hue + ', 90%, ' + tc.streamLight + '%, 0)');
        bgCtx.fillStyle = grad;
        bgCtx.fill();
      }
      if ((s.horizontal && s.x > bgW + 200) || (!s.horizontal && s.y > bgH + 200)) {
        streams[i] = createStream();
      }
    }

    // Sparkle particles with trails
    for (var k = 0; k < sparkles.length; k++) {
      var sp = sparkles[k];
      sp.trail.push({ x: sp.x, y: sp.y });
      if (sp.trail.length > sp.maxTrail) sp.trail.shift();
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life++;

      if (sp.life >= sp.maxLife || sp.x < -20 || sp.x > bgW + 20 || sp.y < -20 || sp.y > bgH + 20) {
        sparkles[k] = createSparkle();
        continue;
      }

      var progress = sp.life / sp.maxLife;
      var alpha = progress < 0.2 ? progress / 0.2 : (1 - progress) / 0.8;
      alpha = Math.max(0, alpha) * 0.7;

      // Trail
      if (sp.trail.length > 1) {
        for (var t = 0; t < sp.trail.length - 1; t++) {
          var ta = (t / sp.trail.length) * alpha * 0.3;
          bgCtx.beginPath();
          bgCtx.arc(sp.trail[t].x, sp.trail[t].y, sp.size * 0.5, 0, Math.PI * 2);
          bgCtx.fillStyle = 'hsla(' + sp.hue + ', ' + tc.sparkleSat + '%, ' + tc.sparkleLight + '%, ' + ta + ')';
          bgCtx.fill();
        }
      }

      // Sparkle head glow
      bgCtx.beginPath();
      bgCtx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      var spGrad = bgCtx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.size * 4);
      spGrad.addColorStop(0, 'hsla(' + sp.hue + ', 90%, ' + (tc.sparkleLight + 5) + '%, ' + alpha + ')');
      spGrad.addColorStop(0.4, 'hsla(' + sp.hue + ', ' + tc.sparkleSat + '%, ' + tc.sparkleLight + '%, ' + (alpha * 0.4) + ')');
      spGrad.addColorStop(1, 'hsla(' + sp.hue + ', ' + tc.streamSat + '%, ' + tc.streamLight + '%, 0)');
      bgCtx.fillStyle = spGrad;
      bgCtx.fill();
    }
  }

  // ─── Physiological State ───────────────────────────────────
  var hrDrift    = createDrift(74, 58, 92, 0.8);
  var bpSysDrift = createDrift(120, 112, 132, 0.3);
  var bpDiaDrift = createDrift(80, 72, 88, 0.2);
  var tempDrift  = createDrift(36.7, 36.4, 37.0, 0.02);

  var currentHR = 74;
  var currentBpSys = 120;
  var currentBpDia = 80;
  var currentTemp = 36.7;

  // ─── ECG Waveform: multiple distinct beat morphologies ─────

  // Slowly drifting per-beat parameters — wide ranges for visible variation
  var rAmpDrift  = createDrift(0.9,  0.40, 1.35, 0.18);
  var tAmpDrift  = createDrift(0.18, 0.02, 0.40, 0.10);
  var pAmpDrift  = createDrift(0.12, 0.02, 0.25, 0.06);
  var sAmpDrift  = createDrift(0.18, 0.04, 0.38, 0.08);
  var tPosDrift  = createDrift(0.35, 0.28, 0.42, 0.03);
  var baselineDrift = createDrift(0, -0.08, 0.08, 0.015);

  function generateBeat(params) {
    var p = params;
    var samples = [];
    var len = p.sampleCount;
    for (var i = 0; i < len; i++) {
      var t = i / len;
      var v = p.baseline;

      // P wave
      v += p.pAmp * Math.exp(-Math.pow((t - p.pPos) / p.pWidth, 2));

      // Q wave
      v -= p.qAmp * Math.exp(-Math.pow((t - p.qPos) / 0.008, 2));

      // R wave (sharp peak)
      v += p.rAmp * Math.exp(-Math.pow((t - p.rPos) / p.rWidth, 2));

      // S wave
      v -= p.sAmp * Math.exp(-Math.pow((t - p.sPos) / 0.012, 2));

      // ST segment elevation/depression
      var stCenter = p.sPos + 0.04;
      v += p.stShift * Math.exp(-Math.pow((t - stCenter) / 0.03, 2));

      // T wave (can be inverted)
      v += p.tAmp * Math.exp(-Math.pow((t - p.tPos) / p.tWidth, 2));

      // U wave
      if (p.uAmp !== 0) {
        v += p.uAmp * Math.exp(-Math.pow((t - p.uPos) / 0.025, 2));
      }

      // Baseline wander
      v += p.wanderAmp * Math.sin(2 * Math.PI * t * p.wanderFreq + p.wanderPhase);

      // Noise
      v += (Math.random() - 0.5) * p.noiseAmp;

      samples.push(v);
    }
    return samples;
  }

  function normalBeatParams(hr) {
    var rrSec = 60.0 / hr;
    var sampleCount = Math.round(250 * rrSec);
    var rAmp = rAmpDrift();
    var tAmp = tAmpDrift();
    var pAmp = pAmpDrift();
    var sAmp = sAmpDrift();
    var tPos = tPosDrift();
    var baseline = baselineDrift();

    // Add per-beat jitter on top of drift
    rAmp += (Math.random() - 0.5) * 0.20;
    tAmp += (Math.random() - 0.5) * 0.10;
    pAmp += (Math.random() - 0.5) * 0.05;
    sAmp += (Math.random() - 0.5) * 0.08;

    return {
      sampleCount: sampleCount,
      baseline: baseline,
      pAmp:  Math.max(0.02, pAmp),
      pPos:  0.10 + (Math.random() - 0.5) * 0.02,
      pWidth: 0.020 + Math.random() * 0.012,
      qAmp:  0.04 + Math.random() * 0.08,
      qPos:  0.17 + (Math.random() - 0.5) * 0.006,
      rAmp:  Math.max(0.4, rAmp),
      rPos:  0.20 + (Math.random() - 0.5) * 0.01,
      rWidth: 0.008 + Math.random() * 0.007,
      sAmp:  Math.max(0.03, sAmp),
      sPos:  0.23 + (Math.random() - 0.5) * 0.006,
      stShift: (Math.random() - 0.5) * 0.04, // slight ST variation
      tAmp:  tAmp,
      tPos:  tPos + (Math.random() - 0.5) * 0.015,
      tWidth: 0.030 + Math.random() * 0.020,
      uAmp:  Math.random() < 0.25 ? 0.02 + Math.random() * 0.04 : 0,
      uPos:  0.46 + Math.random() * 0.04,
      wanderAmp: 0.008 + Math.random() * 0.012,
      wanderFreq: 0.6 + Math.random() * 0.6,
      wanderPhase: Math.random() * Math.PI * 2,
      noiseAmp: 0.006 + Math.random() * 0.010,
    };
  }

  // PAC: premature, smaller, different morphology
  function pacBeatParams(hr) {
    var p = normalBeatParams(hr * 1.2);
    p.sampleCount = Math.round(p.sampleCount * 0.72);
    p.pAmp *= 0.3;
    p.rAmp *= 0.75;
    p.tAmp = Math.abs(p.tAmp) * 1.4;
    p.stShift = 0.02 + Math.random() * 0.03;
    return p;
  }

  // Compensatory pause after PAC
  function compensatoryParams(hr) {
    var p = normalBeatParams(hr * 0.82);
    p.sampleCount = Math.round(p.sampleCount * 1.30);
    p.rAmp *= 1.1; // slightly taller after pause
    return p;
  }

  // Respiratory sinus arrhythmia
  var breathPhase = 0;
  var breathRate = 0.0025 + Math.random() * 0.002;

  function getRespiratoryMod() {
    breathPhase += breathRate;
    if (breathPhase > Math.PI * 2) breathPhase -= Math.PI * 2;
    return Math.sin(breathPhase) * 7; // +/- 7 bpm
  }

  // ─── Beat Sequencer ────────────────────────────────────────
  var beatQueue = [];
  var beatCount = 0;

  function queueNextBeat() {
    currentHR = hrDrift();
    var breathMod = getRespiratoryMod();
    var effectiveHR = currentHR + breathMod;

    var params;
    if (beatCount > 6 && Math.random() < 0.035) {
      // PAC
      params = pacBeatParams(effectiveHR);
      var pacSamples = generateBeat(params);
      for (var a = 0; a < pacSamples.length; a++) beatQueue.push(pacSamples[a]);
      // Compensatory
      var compParams = compensatoryParams(effectiveHR);
      var compSamples = generateBeat(compParams);
      for (var b = 0; b < compSamples.length; b++) beatQueue.push(compSamples[b]);
    } else {
      params = normalBeatParams(effectiveHR);
      var samples = generateBeat(params);
      for (var c = 0; c < samples.length; c++) beatQueue.push(samples[c]);
    }
    beatCount++;
  }

  // Pre-fill the buffer entirely so the canvas starts full
  for (var init = 0; init < 15; init++) queueNextBeat();

  // ─── ECG Canvas ────────────────────────────────────────────
  var ecgCanvas = document.getElementById('ecgCanvas');
  var ecgCtx = ecgCanvas.getContext('2d');
  var ecgContainer = ecgCanvas.parentElement;
  var ecgW = 0, ecgH = 0;
  var DISPLAY_POINTS = 600;
  var displayBuffer = new Float32Array(DISPLAY_POINTS);
  var writeHead = 0;

  // Padding for axes (in CSS px)
  var PAD_LEFT = 50, PAD_BOTTOM = 35, PAD_TOP = 10, PAD_RIGHT = 0;

  // ─── Multi-Channel Lead Configuration ──────────────────────
  var numChannels = 1;

  var LEAD_CONFIGS = {
    1: ['II'],
    3: ['I', 'II', 'III'],
    6: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF']
  };

  // Approximate lead transforms relative to Lead II
  var leadTransforms = {
    'I':   function (v) { return v * 0.65 + 0.02; },
    'II':  function (v) { return v; },
    'III': function (v) { return v * 0.45 - 0.01; },
    'aVR': function (v) { return -v * 0.72; },
    'aVL': function (v) { return v * 0.32 + 0.03; },
    'aVF': function (v) { return v * 0.78 - 0.01; }
  };

  // Pre-fill display buffer so it's not empty on first draw
  for (var pf = 0; pf < DISPLAY_POINTS; pf++) {
    if (beatQueue.length < 300) queueNextBeat();
    displayBuffer[pf] = beatQueue.length > 0 ? beatQueue.shift() : 0;
  }

  // Measure container and set canvas pixel buffer + CSS size each frame
  function syncCanvasSize() {
    var rect = ecgContainer.getBoundingClientRect();
    var w = Math.floor(rect.width);
    var h = Math.floor(rect.height);
    if (w < 1 || h < 1) return false;
    if (w !== ecgW || h !== ecgH) {
      ecgW = w;
      ecgH = h;
      var dpr = window.devicePixelRatio || 1;
      ecgCanvas.style.width = w + 'px';
      ecgCanvas.style.height = h + 'px';
      ecgCanvas.width = w * dpr;
      ecgCanvas.height = h * dpr;
      ecgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return true;
  }

  var SAMPLES_PER_FRAME = 3;

  function advanceEcg() {
    for (var i = 0; i < SAMPLES_PER_FRAME; i++) {
      if (beatQueue.length < 500) queueNextBeat();
      displayBuffer[writeHead] = beatQueue.length > 0 ? beatQueue.shift() : 0;
      writeHead = (writeHead + 1) % DISPLAY_POINTS;
    }
  }

  function drawEcg() {
    if (!syncCanvasSize()) return;

    var tc = getThemeColors();

    var plotX = PAD_LEFT;
    var plotY = PAD_TOP;
    var plotW = ecgW - PAD_LEFT - PAD_RIGHT;
    var plotH = ecgH - PAD_TOP - PAD_BOTTOM;
    if (plotW < 10 || plotH < 10) return;

    ecgCtx.clearRect(0, 0, ecgW, ecgH);

    var leads = LEAD_CONFIGS[numChannels];
    var stripGap = leads.length > 1 ? 2 : 0;
    var totalGap = stripGap * (leads.length - 1);
    var stripH = (plotH - totalGap) / leads.length;

    for (var ch = 0; ch < leads.length; ch++) {
      var leadName = leads[ch];
      var transform = leadTransforms[leadName];
      var color = tc.leadColors[leadName];
      var shadow = tc.leadShadows[leadName];

      var sy = plotY + ch * (stripH + stripGap);
      var sh = stripH;

      // Grid for this strip
      var cols = 20;
      var rows = leads.length === 1 ? 10 : (leads.length === 3 ? 6 : 4);
      ecgCtx.lineWidth = 0.5;
      for (var c = 0; c <= cols; c++) {
        var gx = plotX + (c / cols) * plotW;
        ecgCtx.strokeStyle = c % 5 === 0 ? tc.gridMajor : tc.gridMinor;
        ecgCtx.beginPath();
        ecgCtx.moveTo(gx, sy);
        ecgCtx.lineTo(gx, sy + sh);
        ecgCtx.stroke();
      }
      var majorR = leads.length === 1 ? 5 : (leads.length === 3 ? 3 : 2);
      for (var r = 0; r <= rows; r++) {
        var gy = sy + (r / rows) * sh;
        ecgCtx.strokeStyle = r % majorR === 0 ? tc.gridMajor : tc.gridMinor;
        ecgCtx.beginPath();
        ecgCtx.moveTo(plotX, gy);
        ecgCtx.lineTo(plotX + plotW, gy);
        ecgCtx.stroke();
      }

      // Lead label
      ecgCtx.fillStyle = color;
      ecgCtx.font = 'bold ' + (leads.length > 3 ? '9' : '11') + 'px sans-serif';
      ecgCtx.textAlign = 'left';
      ecgCtx.textBaseline = 'top';
      ecgCtx.fillText(leadName, plotX + 5, sy + 3);

      // Strip separator
      if (ch > 0) {
        ecgCtx.beginPath();
        ecgCtx.moveTo(plotX, sy - stripGap / 2);
        ecgCtx.lineTo(plotX + plotW, sy - stripGap / 2);
        ecgCtx.strokeStyle = tc.separator;
        ecgCtx.lineWidth = 1;
        ecgCtx.stroke();
      }

      // Waveform
      var vMin = -0.5, vMax = 1.5;
      if (leadName === 'aVR') { vMin = -1.5; vMax = 0.5; }
      var vRange = vMax - vMin;
      var gapSize = 12;

      ecgCtx.save();
      ecgCtx.beginPath();
      ecgCtx.rect(plotX, sy, plotW, sh);
      ecgCtx.clip();

      var lw = leads.length > 3 ? 1.5 : (leads.length > 1 ? 2 : 2.5);
      ecgCtx.lineWidth = lw;
      ecgCtx.lineJoin = 'round';
      ecgCtx.lineCap = 'round';
      ecgCtx.shadowColor = shadow;
      ecgCtx.shadowBlur = leads.length > 3 ? 3 : (leads.length > 1 ? 5 : 8);
      ecgCtx.strokeStyle = color;

      ecgCtx.beginPath();
      var drawing = false;

      for (var i = 0; i < DISPLAY_POINTS; i++) {
        // Fixed screen position per buffer index (sweep style)
        var aheadOfHead = (i - writeHead + DISPLAY_POINTS) % DISPLAY_POINTS;

        // Gap just ahead of write head (the eraser)
        if (aheadOfHead < gapSize) {
          if (drawing) { ecgCtx.stroke(); drawing = false; }
          continue;
        }

        var x = plotX + (i / (DISPLAY_POINTS - 1)) * plotW;
        var val = transform(displayBuffer[i]);
        var y = sy + sh - ((val - vMin) / vRange) * sh;

        if (!drawing) {
          ecgCtx.beginPath();
          ecgCtx.moveTo(x, y);
          drawing = true;
        } else {
          ecgCtx.lineTo(x, y);
        }
      }
      if (drawing) ecgCtx.stroke();

      ecgCtx.restore();
    }

    // Y-axis labels (single channel only)
    if (numChannels === 1) {
      var yLabels = ['1.5', '1.0', '0.5', '0', '-0.5'];
      ecgCtx.fillStyle = tc.axisText;
      ecgCtx.font = '11px sans-serif';
      ecgCtx.textAlign = 'right';
      ecgCtx.textBaseline = 'middle';
      for (var yl = 0; yl < yLabels.length; yl++) {
        var labelY = plotY + (yl / (yLabels.length - 1)) * plotH;
        ecgCtx.fillText(yLabels[yl], plotX - 6, labelY);
      }

      ecgCtx.save();
      ecgCtx.translate(12, plotY + plotH / 2);
      ecgCtx.rotate(-Math.PI / 2);
      ecgCtx.textAlign = 'center';
      ecgCtx.textBaseline = 'middle';
      ecgCtx.font = '10px sans-serif';
      ecgCtx.fillStyle = tc.axisText;
      ecgCtx.fillText('Voltage in mV', 0, 0);
      ecgCtx.restore();
    }

    // X-axis label
    ecgCtx.fillStyle = tc.axisText;
    ecgCtx.font = '10px sans-serif';
    ecgCtx.textAlign = 'center';
    ecgCtx.textBaseline = 'top';
    ecgCtx.fillText('Time in seconds', plotX + plotW / 2, plotY + plotH + 12);
  }

  // ─── Humanized Metric Updates ──────────────────────────────
  var displayedHR = 74;
  var displayedPR = 158;
  var displayedQT = 393;
  var displayedQRS = 111;

  function prFromHR(hr) { return 170 - (hr - 60) * 0.4; }
  function qtFromHR(hr) { return 400 * Math.sqrt(60 / hr); }

  function lerpTo(current, target, speed) {
    return current + (target - current) * speed;
  }

  var prNoise  = createDrift(0, -4, 4, 0.3);
  var qtNoise  = createDrift(0, -8, 8, 0.4);
  var qrsNoise = createDrift(0, -3, 3, 0.2);

  var hrEl  = document.getElementById('hrValue');
  var prEl  = document.getElementById('prValue');
  var qtEl  = document.getElementById('qtValue');
  var qrsEl = document.getElementById('qrsValue');
  var bpEl  = document.getElementById('bpValue');
  var tempEl = document.getElementById('tempValue');

  function updateMetrics() {
    var targetHR = Math.round(currentHR);
    displayedHR = Math.round(lerpTo(displayedHR, targetHR, 0.3));

    var targetPR  = Math.round(prFromHR(currentHR) + prNoise());
    var targetQT  = Math.round(qtFromHR(currentHR) + qtNoise());
    var targetQRS = Math.round(108 + qrsNoise());

    displayedPR  = Math.round(lerpTo(displayedPR, targetPR, 0.25));
    displayedQT  = Math.round(lerpTo(displayedQT, targetQT, 0.25));
    displayedQRS = Math.round(lerpTo(displayedQRS, targetQRS, 0.2));

    displayedPR  = Math.max(120, Math.min(200, displayedPR));
    displayedQT  = Math.max(340, Math.min(460, displayedQT));
    displayedQRS = Math.max(80, Math.min(130, displayedQRS));

    hrEl.innerHTML  = displayedHR + ' <small>bpm</small>';
    prEl.innerHTML  = displayedPR + ' <small>ms</small>';
    qtEl.innerHTML  = displayedQT + ' <small>ms</small>';
    qrsEl.innerHTML = displayedQRS + ' <small>ms</small>';

    currentBpSys = bpSysDrift();
    currentBpDia = bpDiaDrift();
    if (currentBpSys - currentBpDia < 30) currentBpDia = currentBpSys - 30;
    bpEl.textContent = Math.round(currentBpSys) + '/' + Math.round(currentBpDia) + ' mmHg';

    currentTemp = tempDrift();
    tempEl.innerHTML = currentTemp.toFixed(1) + ' &deg;C';
  }

  setInterval(updateMetrics, 1800);
  updateMetrics();

  // ─── Channel Selector ─────────────────────────────────────
  var channelBtn = document.getElementById('channelBtn');
  var channelDropdown = document.getElementById('channelDropdown');
  var channelLabel = document.getElementById('channelLabel');
  var chartLead = document.getElementById('chartLead');

  channelBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    channelDropdown.classList.toggle('open');
  });

  document.addEventListener('click', function () {
    channelDropdown.classList.remove('open');
  });

  var channelOptions = channelDropdown.querySelectorAll('.channel-option');
  for (var co = 0; co < channelOptions.length; co++) {
    channelOptions[co].addEventListener('click', function () {
      var count = parseInt(this.getAttribute('data-channels'), 10);
      numChannels = count;
      channelLabel.textContent = count + ' Channel' + (count > 1 ? 's' : '');
      chartLead.textContent = count === 1 ? 'Lead II' : (count + ' Leads');
      for (var j = 0; j < channelOptions.length; j++) channelOptions[j].classList.remove('active');
      this.classList.add('active');
      channelDropdown.classList.remove('open');
    });
  }

  // ─── Theme Toggle ────────────────────────────────────────
  var themeToggle = document.getElementById('themeToggle');
  var themeLabel = document.getElementById('themeLabel');

  // Restore saved theme
  var savedTheme = localStorage.getItem('ecg-theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeLabel) themeLabel.textContent = 'Light Mode';
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var currentlyDark = isDarkMode();
      if (currentlyDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('ecg-theme', 'light');
        if (themeLabel) themeLabel.textContent = 'Dark Mode';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('ecg-theme', 'dark');
        if (themeLabel) themeLabel.textContent = 'Light Mode';
      }
    });
  }

  // ─── Main Loop ─────────────────────────────────────────────
  function loop() {
    advanceEcg();
    drawEcg();
    updateBgStreams();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
