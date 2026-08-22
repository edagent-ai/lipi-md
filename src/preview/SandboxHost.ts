import { buildSrcdoc, RUNTIMES } from '../sandbox/runtime';
import { getP5Source } from '../sandbox/p5addon';
import { RUNTIME_LABEL, type RunSpec } from '../markdown/fence';
import { highlightCode } from '../markdown/highlight';
import { uid } from '../lib/util';

type Status = 'idle' | 'loading' | 'running' | 'paused' | 'error';

interface SandboxMessage {
  channel: string;
  type: 'ready' | 'console' | 'status' | 'height' | 'clear';
  level?: string;
  text?: string;
  state?: Status;
  height?: number;
}

export interface SandboxDeps {
  /** Re-run automatically as the user types. */
  autoRun: () => boolean;
  /** Invoked when a p5 block is present but the add-on is not installed. */
  onInstallP5: () => void;
}

const MAX_LOG_LINES = 200;

/* One window listener fans out to every sandbox, matched by channel token and
 * verified by source window identity (origins are opaque, so unusable here). */
const registry = new Map<string, SandboxHost>();

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as SandboxMessage | null;
  if (!data || typeof data.channel !== 'string') return;
  const host = registry.get(data.channel);
  if (!host || event.source !== host.frameWindow) return;
  host.receive(data);
});

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export class SandboxHost {
  readonly el: HTMLElement;

  private spec: RunSpec;
  private code: string;
  private readonly deps: SandboxDeps;
  private readonly channel = uid();

  private iframe: HTMLIFrameElement | null = null;
  private observer: IntersectionObserver | null = null;

  private started = false;
  private ready = false;
  private stale = false;
  private destroyed = false;
  private status: Status = 'idle';
  private errorCount = 0;
  private logCount = 0;

  private readonly stage: HTMLElement;
  private readonly overlay: HTMLButtonElement;
  private readonly statusEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  private readonly consoleEl: HTMLElement;
  private readonly consoleBody: HTMLElement;
  private readonly consoleBtn: HTMLButtonElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly sourceBtn: HTMLButtonElement;
  private readonly expandBtn: HTMLButtonElement;
  private readonly sourceEl: HTMLElement;
  private readonly sourceCode: HTMLElement;

  constructor(spec: RunSpec, code: string, deps: SandboxDeps) {
    this.spec = spec;
    this.code = code;
    this.deps = deps;
    registry.set(this.channel, this);

    this.el = el('div', 'sandbox');
    this.el.dataset.runtime = spec.runtime;

    /* --- title bar --- */
    const bar = el('header', 'sandbox-bar');
    this.titleEl = el('span', 'sandbox-title');
    this.statusEl = el('span', 'sandbox-status');
    const actions = el('div', 'sandbox-actions');

    this.playBtn = this.action('▮▮', 'Pause', () => this.togglePause());
    const restartBtn = this.action('↻', 'Restart', () => this.restart());
    this.consoleBtn = this.action('Console', 'Show console', () => this.toggleConsole());
    this.consoleBtn.classList.add('is-text');
    this.sourceBtn = this.action('Source', 'Show source', () => this.toggleSource());
    this.sourceBtn.classList.add('is-text');
    this.expandBtn = this.action('⤢', 'Expand', () => {
      const expanded = this.el.classList.toggle('is-expanded');
      this.expandBtn.setAttribute('aria-pressed', String(expanded));
      this.expandBtn.title = expanded ? 'Collapse' : 'Expand';
      this.applyHeight();
    });
    this.expandBtn.setAttribute('aria-pressed', 'false');

    actions.append(this.playBtn, restartBtn, this.consoleBtn, this.sourceBtn, this.expandBtn);
    bar.append(this.titleEl, this.statusEl, actions);

    /* --- stage --- */
    this.stage = el('div', 'sandbox-stage');
    this.overlay = el('button', 'sandbox-overlay');
    this.overlay.type = 'button';
    this.overlay.addEventListener('click', () => this.onOverlayClick());
    this.stage.append(this.overlay);

    /* --- source + console --- */
    this.sourceEl = el('figure', 'sandbox-source');
    this.sourceEl.hidden = true;
    const pre = el('pre');
    this.sourceCode = el('code');
    pre.append(this.sourceCode);
    this.sourceEl.append(pre);

    this.consoleEl = el('div', 'sandbox-console');
    this.consoleEl.hidden = true;
    const consoleHead = el('div', 'sandbox-console-head');
    const clearBtn = el('button', 'link-btn', 'Clear');
    clearBtn.type = 'button';
    clearBtn.addEventListener('click', () => this.clearConsole());
    consoleHead.append(el('span', '', 'Console'), clearBtn);
    this.consoleBody = el('div', 'sandbox-console-body');
    this.consoleEl.append(consoleHead, this.consoleBody);

    this.el.append(bar, this.stage, this.sourceEl, this.consoleEl);

    this.renderChrome();
    this.applyHeight();
    this.watchVisibility();
  }

  private action(label: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = el('button', 'sandbox-btn', label);
    btn.type = 'button';
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.addEventListener('click', onClick);
    return btn;
  }

  get frameWindow(): Window | null {
    return this.iframe?.contentWindow ?? null;
  }

  /* ------------------------------------------------------------------ */

  private renderChrome(): void {
    const label = RUNTIME_LABEL[this.spec.runtime];
    this.titleEl.textContent = this.spec.title ? `${label} · ${this.spec.title}` : label;
    // Keys are positional, so inserting a sketch above others repurposes an
    // existing host to a different runtime — the attribute has to follow.
    this.el.dataset.runtime = this.spec.runtime;
    if (this.iframe) this.iframe.title = this.titleEl.textContent;

    // `code` on the fence pins the source open; otherwise the user's own
    // toggle decides.
    if (this.spec.showCode) this.sourceEl.hidden = false;
    this.sourceCode.innerHTML = highlightCode(this.code, 'js');

    this.statusEl.dataset.state = this.stale ? 'stale' : this.status;
    this.statusEl.textContent = this.stale
      ? 'edited'
      : this.status === 'running'
        ? 'running'
        : this.status === 'paused'
          ? 'paused'
          : this.status === 'error'
            ? 'error'
            : this.status === 'loading'
              ? 'loading'
              : '';

    const paused = this.status === 'paused';
    this.playBtn.textContent = paused ? '▶' : '▮▮';
    // title and aria-label must move together, or assistive tech announces the
    // action the button no longer performs.
    this.playBtn.title = paused ? 'Resume' : 'Pause';
    this.playBtn.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
    this.playBtn.disabled = !this.started || this.status === 'error';

    this.consoleBtn.textContent = this.errorCount
      ? `Console (${this.errorCount})`
      : this.logCount
        ? `Console ${this.logCount}`
        : 'Console';
    this.consoleBtn.classList.toggle('has-errors', this.errorCount > 0);
    this.consoleBtn.setAttribute('aria-expanded', String(!this.consoleEl.hidden));
    this.consoleBtn.setAttribute(
      'aria-label',
      this.consoleEl.hidden ? 'Show console' : 'Hide console',
    );
    this.sourceBtn.setAttribute('aria-expanded', String(!this.sourceEl.hidden));
    this.sourceBtn.setAttribute(
      'aria-label',
      this.sourceEl.hidden ? 'Show source' : 'Hide source',
    );
  }

  private applyHeight(): void {
    if (this.el.classList.contains('is-expanded')) {
      this.stage.style.height = '';
      return;
    }
    this.stage.style.height = this.spec.height === 'auto' ? '' : `${this.spec.height}px`;
    if (this.spec.height === 'auto' && !this.stage.style.minHeight) {
      this.stage.style.minHeight = '48px';
    }
  }

  /** Sketches boot on first scroll into view, so a long document stays cheap. */
  private watchVisibility(): void {
    if (this.spec.manual || typeof IntersectionObserver === 'undefined') {
      this.showOverlay(this.spec.manual ? 'Run sketch' : null);
      if (!this.spec.manual) this.start();
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.observer?.disconnect();
          this.observer = null;
          this.start();
        }
      },
      { rootMargin: '200px' },
    );
    this.observer.observe(this.el);
  }

  private showOverlay(label: string | null): void {
    this.overlay.hidden = label === null;
    this.overlay.textContent = label ?? '';
  }

  private onOverlayClick(): void {
    if (!this.started) {
      void this.start();
      return;
    }
    this.send({ type: 'run', code: this.code });
    this.stale = false;
    this.showOverlay(null);
    this.renderChrome();
  }

  /* ------------------------------------------------------------------ */

  private async start(): Promise<void> {
    if (this.started || this.destroyed) return;
    this.started = true;
    this.status = 'loading';
    this.renderChrome();

    let libSource: string | undefined;
    if (RUNTIMES[this.spec.runtime].addon) {
      const source = await getP5Source();
      if (this.destroyed) return;
      if (!source) {
        this.started = false;
        this.status = 'idle';
        this.showInstallPrompt();
        this.renderChrome();
        return;
      }
      libSource = source;
    }

    const frame = document.createElement('iframe');
    frame.className = 'sandbox-frame';
    frame.title = this.titleEl.textContent ?? 'Sketch';
    // No allow-same-origin: the sandbox gets an opaque origin and therefore no
    // reach into this document, its storage, or its service worker.
    frame.setAttribute(
      'sandbox',
      'allow-scripts allow-pointer-lock allow-modals allow-downloads',
    );
    frame.setAttribute('loading', 'lazy');
    frame.srcdoc = buildSrcdoc({
      channel: this.channel,
      runtime: this.spec.runtime,
      height: this.spec.height,
      libSource,
    });

    this.iframe = frame;
    this.showOverlay(null);
    this.stage.append(frame);
  }

  private showInstallPrompt(): void {
    const prompt = el('div', 'sandbox-install');
    prompt.append(
      el('p', '', 'This sketch needs the p5.js add-on, which is not installed yet.'),
    );
    const btn = el('button', 'btn btn-primary', 'Install p5.js');
    btn.type = 'button';
    btn.addEventListener('click', () => this.deps.onInstallP5());
    prompt.append(btn);
    this.showOverlay(null);
    this.stage.querySelector('.sandbox-install')?.remove();
    this.stage.append(prompt);
  }

  private send(message: Record<string, unknown>): void {
    this.frameWindow?.postMessage({ ...message, channel: this.channel }, '*');
  }

  /* ------------------------------------------------------------------ */

  update(spec: RunSpec, code: string): void {
    const runtimeChanged = spec.runtime !== this.spec.runtime;
    const heightChanged = spec.height !== this.spec.height;
    const codeChanged = code !== this.code;

    this.spec = spec;
    this.code = code;

    if (runtimeChanged) {
      // A different library must be loaded, so the frame is rebuilt.
      this.teardownFrame();
      this.started = false;
      this.ready = false;
      this.status = 'idle';
      this.clearConsole();
      this.renderChrome();
      this.applyHeight();
      this.watchVisibility();
      return;
    }

    if (heightChanged) this.applyHeight();

    if (codeChanged) {
      if (!this.started) {
        this.renderChrome();
        return;
      }
      if (this.deps.autoRun()) {
        this.stale = false;
        if (this.ready) this.send({ type: 'run', code });
      } else {
        this.stale = true;
        this.showOverlay('Update sketch');
      }
    }
    this.renderChrome();
  }

  receive(message: SandboxMessage): void {
    switch (message.type) {
      case 'ready':
        this.ready = true;
        this.send({ type: 'run', code: this.code });
        break;
      case 'status':
        if (message.state) this.status = message.state;
        if (message.state === 'error') this.errorCount++;
        this.renderChrome();
        break;
      case 'clear':
        this.clearConsole();
        break;
      case 'console':
        this.appendLog(message.level ?? 'log', message.text ?? '');
        break;
      case 'height':
        if (this.spec.height === 'auto' && message.height) {
          this.stage.style.height = `${message.height}px`;
        }
        break;
    }
  }

  private appendLog(level: string, text: string): void {
    if (level === 'error') {
      this.errorCount++;
      // An error is worth interrupting for; ordinary logs are not.
      this.consoleEl.hidden = false;
    }
    this.logCount++;

    const line = el('div', `log log-${level}`, text);
    this.consoleBody.append(line);
    while (this.consoleBody.childElementCount > MAX_LOG_LINES) {
      this.consoleBody.firstElementChild?.remove();
    }
    this.consoleBody.scrollTop = this.consoleBody.scrollHeight;
    this.renderChrome();
  }

  private clearConsole(): void {
    this.consoleBody.replaceChildren();
    this.errorCount = 0;
    this.logCount = 0;
    this.renderChrome();
  }

  private toggleConsole(): void {
    this.consoleEl.hidden = !this.consoleEl.hidden;
    this.renderChrome();
  }

  private toggleSource(): void {
    this.sourceEl.hidden = !this.sourceEl.hidden;
    this.renderChrome();
  }

  private togglePause(): void {
    this.send({ type: this.status === 'paused' ? 'resume' : 'pause' });
  }

  private restart(): void {
    if (!this.started) {
      void this.start();
      return;
    }
    this.stale = false;
    this.clearConsole();
    this.send({ type: 'run', code: this.code });
  }

  private teardownFrame(): void {
    this.iframe?.remove();
    this.iframe = null;
  }

  destroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
    this.observer = null;
    this.teardownFrame();
    registry.delete(this.channel);
    this.el.remove();
  }
}
