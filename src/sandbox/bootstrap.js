/**
 * Runs inside every sandbox iframe (`sandbox="allow-scripts"`, so an opaque
 * origin with no access to the parent document, its storage, or its cookies).
 *
 * Injected verbatim into `srcdoc`; user code never travels in the markup — it
 * arrives by postMessage, which sidesteps HTML escaping entirely and lets a
 * sketch be re-run without reloading the frame or reloading the library.
 *
 * Loaded as a raw string by `runtime.ts`; keep it dependency-free ES5-ish JS.
 */
(function () {
  'use strict';

  var cfg = window.__LIPI__ || {};
  var parentWindow = window.parent;

  /* Capture natives before anything patches them. */
  var nativeRAF = window.requestAnimationFrame.bind(window);
  var nativeCAF = window.cancelAnimationFrame.bind(window);
  var nativeSetTimeout = window.setTimeout.bind(window);
  var nativeClearTimeout = window.clearTimeout.bind(window);
  var nativeSetInterval = window.setInterval.bind(window);
  var nativeClearInterval = window.clearInterval.bind(window);
  var nativeAddListener = window.addEventListener.bind(window);
  var nativeDocAddListener = document.addEventListener.bind(document);
  var nativeConsole = {};

  function post(message) {
    message.channel = cfg.channel;
    try {
      parentWindow.postMessage(message, '*');
    } catch (err) {
      /* parent went away */
    }
  }

  /* ------------------------------------------------------------------ *
   * Resource tracking — everything a sketch starts must be stoppable.
   * ------------------------------------------------------------------ */

  var rafs = {};
  var timeouts = {};
  var intervals = {};
  var listeners = [];
  var paused = false;
  var resumeQueue = [];

  window.requestAnimationFrame = function (callback) {
    var id = nativeRAF(function (time) {
      delete rafs[id];
      if (paused) {
        resumeQueue.push(callback);
        return;
      }
      callback(time);
    });
    rafs[id] = true;
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    delete rafs[id];
    nativeCAF(id);
  };
  window.setTimeout = function (fn, delay) {
    var extra = Array.prototype.slice.call(arguments, 2);
    var id = nativeSetTimeout(function () {
      delete timeouts[id];
      fn.apply(null, extra);
    }, delay);
    timeouts[id] = true;
    return id;
  };
  window.clearTimeout = function (id) {
    delete timeouts[id];
    nativeClearTimeout(id);
  };
  window.setInterval = function (fn, delay) {
    var extra = Array.prototype.slice.call(arguments, 2);
    var id = nativeSetInterval(function () {
      fn.apply(null, extra);
    }, delay);
    intervals[id] = true;
    return id;
  };
  window.clearInterval = function (id) {
    delete intervals[id];
    nativeClearInterval(id);
  };

  function trackListeners(target, native) {
    return function (type, handler, options) {
      listeners.push({ target: target, type: type, handler: handler, options: options });
      return native(type, handler, options);
    };
  }
  window.addEventListener = trackListeners(window, nativeAddListener);
  document.addEventListener = trackListeners(document, nativeDocAddListener);

  function releaseResources() {
    for (var r in rafs) nativeCAF(Number(r));
    for (var t in timeouts) nativeClearTimeout(Number(t));
    for (var i in intervals) nativeClearInterval(Number(i));
    rafs = {};
    timeouts = {};
    intervals = {};
    resumeQueue = [];

    for (var n = 0; n < listeners.length; n++) {
      var entry = listeners[n];
      try {
        entry.target.removeEventListener(entry.type, entry.handler, entry.options);
      } catch (err) {
        /* ignore */
      }
    }
    listeners = [];
  }

  /* ------------------------------------------------------------------ *
   * Console + error capture
   * ------------------------------------------------------------------ */

  function preview(value, depth) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    var type = typeof value;
    if (type === 'string') return depth > 0 ? JSON.stringify(value) : value;
    if (type === 'number' || type === 'boolean' || type === 'bigint') return String(value);
    if (type === 'function') return 'ƒ ' + (value.name || 'anonymous') + '()';
    if (type === 'symbol') return String(value);
    if (value instanceof Error) return value.name + ': ' + value.message;
    if (depth > 2) return Array.isArray(value) ? '[…]' : '{…}';

    try {
      if (Array.isArray(value)) {
        var head = value.slice(0, 12).map(function (v) {
          return preview(v, depth + 1);
        });
        if (value.length > 12) head.push('… +' + (value.length - 12));
        return '[' + head.join(', ') + ']';
      }
      if (value.nodeType === 1) return '<' + value.tagName.toLowerCase() + '>';

      var keys = Object.keys(value).slice(0, 12);
      var body = keys.map(function (k) {
        return k + ': ' + preview(value[k], depth + 1);
      });
      if (Object.keys(value).length > 12) body.push('…');
      var name = value.constructor && value.constructor.name;
      return (name && name !== 'Object' ? name + ' ' : '') + '{' + body.join(', ') + '}';
    } catch (err) {
      return String(value);
    }
  }

  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
    nativeConsole[level] = console[level] ? console[level].bind(console) : function () {};
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      nativeConsole[level].apply(null, args);
      post({
        type: 'console',
        level: level,
        text: args
          .map(function (a) {
            return preview(a, 0);
          })
          .join(' '),
      });
    };
  });

  function reportError(err, where) {
    var text;
    if (err && err.message) text = (err.name || 'Error') + ': ' + err.message;
    else text = String(err);
    if (where) text += ' (' + where + ')';
    post({ type: 'console', level: 'error', text: text });
    post({ type: 'status', state: 'error' });
  }

  nativeAddListener('error', function (event) {
    // Failed subresources (images, fonts) surface here with no `error` object.
    if (!event.error && event.target && event.target !== window) {
      post({
        type: 'console',
        level: 'warn',
        text: 'Failed to load ' + (event.target.src || event.target.href || 'a resource'),
      });
      return;
    }
    reportError(event.error || event.message, 'line ' + event.lineno);
  });

  nativeAddListener('unhandledrejection', function (event) {
    reportError(event.reason, 'unhandled promise rejection');
  });

  /* ------------------------------------------------------------------ *
   * Stage + sizing
   * ------------------------------------------------------------------ */

  var stage;

  function resetStage() {
    document.body.innerHTML = '';
    stage = document.createElement('div');
    stage.id = 'stage';
    document.body.appendChild(stage);
    window.stage = stage;
    return stage;
  }

  var lastHeight = 0;
  function reportHeight() {
    if (cfg.height !== 'auto') return;
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      stage ? stage.scrollHeight : 0,
    );
    h = Math.max(h, 40);
    if (Math.abs(h - lastHeight) < 2) return;
    lastHeight = h;
    post({ type: 'height', height: h });
  }

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(reportHeight).observe(document.documentElement);
  }

  function evalUserCode(code) {
    // Indirect eval keeps user code at global scope so `function setup()` and
    // friends become window properties, which is what p5's global mode reads.
    (0, eval)(code + '\n//# sourceURL=sketch.js');
  }

  /* ------------------------------------------------------------------ *
   * Runtimes
   * ------------------------------------------------------------------ */

  var P5_HOOKS = [
    'preload',
    'setup',
    'draw',
    'windowResized',
    'mousePressed',
    'mouseReleased',
    'mouseMoved',
    'mouseDragged',
    'mouseClicked',
    'doubleClicked',
    'mouseWheel',
    'keyPressed',
    'keyReleased',
    'keyTyped',
    'touchStarted',
    'touchMoved',
    'touchEnded',
    'deviceMoved',
    'deviceTurned',
    'deviceShaken',
  ];

  var runtimes = {
    p5: {
      instance: null,
      watcher: null,
      /**
       * p5's global mode appends its canvas straight to <body>, where it lands
       * *after* the full-height #stage and gets clipped away by overflow:hidden.
       * Adopting stray body children into the stage keeps one layout model —
       * and unlike an iframe, moving a canvas preserves what it has drawn.
       * An observer rather than a one-shot sweep, because preload() defers
       * setup() and therefore canvas creation.
       */
      adopt: function () {
        var children = document.body.children;
        for (var i = children.length - 1; i >= 0; i--) {
          var node = children[i];
          if (node !== stage && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
            stage.appendChild(node);
          }
        }
      },
      run: function (code) {
        var self = this;
        this.watcher = new MutationObserver(function () {
          self.adopt();
        });
        this.watcher.observe(document.body, { childList: true });

        evalUserCode(code);
        if (typeof window.setup !== 'function' && typeof window.draw !== 'function') {
          post({
            type: 'console',
            level: 'warn',
            text: 'No setup() or draw() found — a p5 sketch needs at least one.',
          });
        }
        self.instance = new window.p5();
        self.adopt();
      },
      teardown: function () {
        if (this.watcher) {
          this.watcher.disconnect();
          this.watcher = null;
        }
        if (this.instance) {
          try {
            this.instance.remove();
          } catch (err) {
            /* ignore */
          }
          this.instance = null;
        }
        for (var i = 0; i < P5_HOOKS.length; i++) {
          try {
            delete window[P5_HOOKS[i]];
          } catch (err) {
            window[P5_HOOKS[i]] = undefined;
          }
        }
      },
      pause: function () {
        if (this.instance && this.instance.noLoop) this.instance.noLoop();
      },
      resume: function () {
        if (this.instance && this.instance.loop) this.instance.loop();
      },
      renderOnce: function () {
        if (this.instance && this.instance.redraw) this.instance.redraw();
      },
    },

    canvas: {
      run: function (code) {
        var canvas = document.createElement('canvas');
        var dpr = window.devicePixelRatio || 1;
        var w = stage.clientWidth || window.innerWidth;
        var h = stage.clientHeight || window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        stage.appendChild(canvas);

        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Sketches think in CSS pixels; the DPR scale above keeps it crisp.
        window.canvas = canvas;
        window.ctx = ctx;
        window.width = w;
        window.height = h;
        var self = this;
        self.frame = null;
        self.start = performance.now();
        window.loop = function (frame) {
          self.frame = frame;
          var tick = function (now) {
            frame(now - self.start);
            window.requestAnimationFrame(tick);
          };
          window.requestAnimationFrame(tick);
        };
        evalUserCode(code);
      },
      teardown: function () {
        this.frame = null;
        window.canvas = undefined;
        window.ctx = undefined;
        window.loop = undefined;
      },
      /* Draw a frame synchronously — see `renderOnce` below. */
      renderOnce: function () {
        if (this.frame) this.frame(performance.now() - this.start);
      },
    },

    anime: {
      scope: null,
      run: function (code) {
        var lib = window.__lipiAnime;
        if (lib && lib.default) lib = lib.default;
        if (!lib) throw new Error('Anime.js runtime failed to load');

        window.anime = lib;
        for (var key in lib) {
          if (key !== 'default' && !(key in window)) window[key] = lib[key];
        }

        // `createScope` is Anime's own teardown unit — reverting it undoes
        // every animation and inline style the sketch created.
        if (typeof lib.createScope === 'function') {
          this.scope = lib.createScope({ root: stage });
          this.scope.add(function () {
            evalUserCode(code);
          });
        } else {
          evalUserCode(code);
        }
      },
      teardown: function () {
        if (this.scope) {
          try {
            this.scope.revert();
          } catch (err) {
            /* ignore */
          }
          this.scope = null;
        }
      },
    },

    js: {
      run: function (code) {
        evalUserCode(code);
      },
      teardown: function () {},
    },
  };

  var runtime = runtimes[cfg.runtime] || runtimes.js;
  var currentCode = null;

  function teardown() {
    releaseResources();
    paused = false;
    try {
      if (runtime.teardown) runtime.teardown();
    } catch (err) {
      /* ignore */
    }
    resetStage();
  }

  function run(code) {
    currentCode = code;
    teardown();
    post({ type: 'status', state: 'running' });
    post({ type: 'clear' });
    try {
      runtime.run(code);
    } catch (err) {
      reportError(err);
      return;
    }
    nativeSetTimeout(reportHeight, 0);
  }

  /* ------------------------------------------------------------------ *
   * Parent protocol
   * ------------------------------------------------------------------ */

  nativeAddListener('message', function (event) {
    if (event.source !== parentWindow) return;
    var data = event.data;
    if (!data || data.channel !== cfg.channel) return;

    switch (data.type) {
      case 'run':
        run(data.code);
        break;
      case 'stop':
        teardown();
        post({ type: 'status', state: 'idle' });
        break;
      case 'pause':
        paused = true;
        if (runtime.pause) runtime.pause();
        post({ type: 'status', state: 'paused' });
        break;
      case 'resume': {
        paused = false;
        var queued = resumeQueue;
        resumeQueue = [];
        if (runtime.resume) runtime.resume();
        for (var i = 0; i < queued.length; i++) {
          try {
            queued[i](performance.now());
          } catch (err) {
            reportError(err);
          }
        }
        post({ type: 'status', state: 'running' });
        break;
      }
      case 'restart':
        if (currentCode !== null) run(currentCode);
        break;
      case 'snapshot': {
        // A still frame for HTML/PDF export. The parent cannot read this canvas
        // itself — the frame is opaque-origin — so the pixels come back here.
        var shot = null;
        try {
          // An off-screen iframe gets its rAF throttled, so a sketch that only
          // paints from a rAF loop would be captured blank. Ask the runtime to
          // draw one frame synchronously first.
          if (runtime.renderOnce) runtime.renderOnce();
        } catch (err) {
          /* a sketch that cannot redraw is still worth capturing as-is */
        }
        try {
          var target = document.querySelector('canvas');
          if (target && target.width && target.height) {
            shot = target.toDataURL('image/png');
          }
        } catch (err) {
          shot = null; // tainted or oversized canvas
        }
        post({ type: 'snapshot', id: data.id, dataUrl: shot });
        break;
      }
      default:
        break;
    }
  });

  /* ------------------------------------------------------------------ *
   * Library loading, then announce readiness
   * ------------------------------------------------------------------ */

  function ready() {
    resetStage();
    post({ type: 'ready' });
  }

  function loadLibrary(done) {
    if (cfg.libSource) {
      // Inline source (the p5 add-on, served from IndexedDB) executes
      // synchronously on append.
      var inline = document.createElement('script');
      inline.textContent = cfg.libSource;
      document.head.appendChild(inline);
      done();
      return;
    }
    if (cfg.libUrl) {
      var tag = document.createElement('script');
      tag.src = cfg.libUrl;
      tag.onload = function () {
        done();
      };
      tag.onerror = function () {
        post({
          type: 'console',
          level: 'error',
          text: 'Could not load the ' + cfg.runtime + ' runtime.',
        });
        done();
      };
      document.head.appendChild(tag);
      return;
    }
    done();
  }

  try {
    loadLibrary(ready);
  } catch (err) {
    reportError(err, 'runtime load');
    ready();
  }
})();
