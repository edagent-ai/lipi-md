import { SandboxHost } from '../preview/SandboxHost';
import type { Segment } from '../markdown';

/**
 * Captures sketch stills without a mounted preview.
 *
 * In Write view the preview is unmounted, so there are no live sandboxes to
 * snapshot and exports would silently lose every sketch. This renders the run
 * segments in a throwaway offscreen stage purely to photograph them, so an
 * export is the same document whichever view you happen to be in.
 *
 * The stage is positioned offscreen rather than hidden: `display:none` or
 * `visibility:hidden` would give the sandbox a zero-sized canvas.
 */
export async function captureSketches(segments: Segment[]): Promise<Record<string, string>> {
  const runs = segments.filter((segment) => segment.kind === 'run');
  if (!runs.length) return {};

  const stage = document.createElement('div');
  stage.setAttribute('aria-hidden', 'true');
  stage.style.cssText =
    'position:fixed;left:-10000px;top:0;width:820px;pointer-events:none;z-index:-1;';
  document.body.appendChild(stage);

  const hosts: SandboxHost[] = [];
  try {
    const shots = await Promise.all(
      runs.map(async (segment) => {
        const host = new SandboxHost(segment.spec, segment.code, {
          autoRun: () => true,
          // A missing p5 add-on just yields no still; nothing to prompt about
          // in the middle of an export.
          onInstallP5: () => {},
        });
        hosts.push(host);
        stage.appendChild(host.el);
        return [segment.key, await host.snapshot(6000)] as const;
      }),
    );
    return Object.fromEntries(shots.filter(([, url]) => url)) as Record<string, string>;
  } finally {
    for (const host of hosts) host.destroy();
    stage.remove();
  }
}
