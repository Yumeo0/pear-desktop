import { createPlugin } from '@/utils';
import style from './style.css?inline';
import { MediaType, type SongInfo } from '@/providers/song-info';
import { t } from '@/i18n';
import type { RendererContext } from '@/types/contexts';
import { render } from 'solid-js/web';
import { createEffect, createSignal, For } from 'solid-js';
import { SyncedLine, PlainLyrics } from '../synced-lyrics/renderer/components';
import { setConfig as setSyncedConfig } from '../synced-lyrics/renderer/renderer';

// 1. Define the Config structure
interface Config {
  enabled: boolean;
  perfectSync: boolean;
  romanize: boolean;
}

export default createPlugin({
  name: () => t('plugins.better-fullscreen.name'),
  description: () => t('plugins.better-fullscreen.description'),
  restartNeeded: true,
  config: {
    enabled: true,
    perfectSync: false,
    romanize: false,
  },
  stylesheets: [style],

  renderer: {
    async start(ctx: RendererContext<Config>) {
      const config = await ctx.getConfig();
      let isFullscreen = false;
      let lyrics: any = null;
      let lastSrc = '';

      const ui = {
        container: null as HTMLElement | null,
        closeBtn: null as HTMLElement | null,
        bgLayer: null as HTMLElement | null,
        art: null as HTMLImageElement | null,
        title: null as HTMLElement | null,
        artist: null as HTMLElement | null,
        curr: null as HTMLElement | null,
        dur: null as HTMLElement | null,
        fill: null as HTMLElement | null,
        seek: null as HTMLElement | null,
        lines: null as HTMLElement | null,
        scroll: null as HTMLElement | null,
        canvas: null as HTMLCanvasElement | null,
        viz: null as HTMLElement | null,
        playBtn: null as HTMLElement | null,
        prevBtn: null as HTMLElement | null,
        nextBtn: null as HTMLElement | null,
        iconPlay: null as SVGSVGElement | null,
        iconPause: null as SVGSVGElement | null,
        settingsBtn: null as HTMLElement | null,
        settingsModal: null as HTMLElement | null,
        optSync: null as HTMLInputElement | null,
        optRoman: null as HTMLInputElement | null,
      };

      const FullscreenUI = () => (
        <div ref={(el) => ui.container = el} id="bfs-container">
          <div ref={(el) => ui.bgLayer = el} class="bfs-bg-layer">
            <div class="bfs-blob bfs-blob-1"></div>
            <div class="bfs-blob bfs-blob-2"></div>
            <div class="bfs-blob bfs-blob-3"></div>
            <div class="bfs-blob bfs-blob-4"></div>
            <div class="bfs-blob bfs-blob-5"></div>
          </div>
          <div class="bfs-overlay"></div>
          
          <div class="bfs-corner-zone bfs-zone-left"></div>
          <div class="bfs-corner-zone bfs-zone-right"></div>

          <button ref={(el) => ui.settingsBtn = el} id="bfs-settings-btn" title="Settings">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>

          <button ref={(el) => ui.closeBtn = el} id="bfs-close" title="Exit">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          <div ref={(el) => ui.settingsModal = el} id="bfs-settings-modal">
            <div class="bfs-setting-item">
              <span>Perfect Sync</span>
              <label class="bfs-toggle">
                <input ref={(el) => ui.optSync = el} type="checkbox" id="bfs-opt-sync" checked={config.perfectSync} />
                <span class="bfs-slider"></span>
              </label>
            </div>
            <div class="bfs-setting-item">
              <span>Romanize (Google)</span>
              <label class="bfs-toggle">
                <input ref={(el) => ui.optRoman = el} type="checkbox" id="bfs-opt-roman" checked={config.romanize} />
                <span class="bfs-slider"></span>
              </label>
            </div>
          </div>

          <div class="bfs-content">
            <div class="bfs-lyrics-section">
              <div ref={(el) => ui.viz = el} class="bfs-visualizer-icon" id="bfs-viz">
                <div class="bfs-viz-bar"></div>
                <div class="bfs-viz-bar"></div>
                <div class="bfs-viz-bar"></div>
              </div>
              <div ref={(el) => ui.scroll = el} class="bfs-lyrics-scroll" id="bfs-scroll">
                <div ref={(el) => ui.lines = el} class="bfs-lyrics-wrapper" id="bfs-lines">
                  <LyricsComponent />
                </div>
              </div>
            </div>

            <div class="bfs-meta-section">
              <div class="bfs-art">
                <img ref={(el) => ui.art = el} id="bfs-art" src="" crossorigin="anonymous" />
              </div>
              <div class="bfs-info">
                <div ref={(el) => ui.title = el} class="bfs-title" id="bfs-title">Title</div>
                <div ref={(el) => ui.artist = el} class="bfs-artist" id="bfs-artist">Artist</div>
              </div>
              <div class="bfs-controls-container">
                <div class="bfs-progress-row">
                  <span ref={(el) => ui.curr = el} id="bfs-curr">0:00</span>
                  <div ref={(el) => ui.seek = el} class="bfs-bar-bg" id="bfs-seek">
                    <div ref={(el) => ui.fill = el} class="bfs-bar-fill" id="bfs-fill"></div>
                  </div>
                  <span ref={(el) => ui.dur = el} id="bfs-dur">0:00</span>
                </div>
                <div class="bfs-buttons">
                  <button ref={(el) => ui.prevBtn = el} class="bfs-btn bfs-skip-btn" id="bfs-prev">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                    </svg>
                  </button>
                  <button ref={(el) => ui.playBtn = el} class="bfs-btn bfs-play-btn" id="bfs-play">
                    <svg ref={(el) => ui.iconPlay = el} id="bfs-icon-play" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    <svg ref={(el) => ui.iconPause = el} id="bfs-icon-pause" viewBox="0 0 24 24" style="display:none">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  </button>
                  <button ref={(el) => ui.nextBtn = el} class="bfs-btn bfs-skip-btn" id="bfs-next">
                    <svg viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <canvas ref={(el) => ui.canvas = el} id="bfs-canvas" width="50" height="50"></canvas>
        </div>
      );

      const div = document.createElement('div');
      render(() => <FullscreenUI />, div);
      document.body.appendChild(div);

      const [lyricsSignal, setLyricsSignal] = createSignal<any>(null);
      const [currentTimeSignal, setCurrentTimeSignal] = createSignal<number>(0);
      setSyncedConfig({
        enabled: true,
        preciseTiming: false,
        showTimeCodes: false,
        defaultTextString: '',
        showLyricsEvenIfInexact: false,
        lineEffect: 'focus',
        romanization: config.romanize,
      });

      const LyricsComponent = () => {
        const lyrics = lyricsSignal();
        if (!lyrics) {
          return <div class="bfs-empty">Loading...</div>;
        }
        if (lyrics.lines) {
          return <For each={lyrics.lines}>{(line, index) => {
            const timeMs = currentTimeSignal() * 1000;
            let status: 'upcoming' | 'current' | 'previous' = 'upcoming';
            if (timeMs >= line.timeInMs) {
              status = 'current';
              for (let i = index() + 1; i < lyrics.lines.length; i++) {
                if (timeMs >= lyrics.lines[i].timeInMs) {
                  status = 'previous';
                } else {
                  break;
                }
              }
            }
            return <SyncedLine index={index()} line={line} status={status} />;
          }}</For>;
        } else if (lyrics.plain) {
          return <PlainLyrics line={lyrics.plain} />;
        }
        return <div class="bfs-empty">
          <span>Lyrics not available</span>
          <button class="bfs-refresh-btn" onClick={() => {
            const title = ui.title?.innerText;
            const artist = ui.artist?.innerText;
            const video = document.querySelector('video');
            if(title && artist && video) {
              setLyricsSignal(null);
            }
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Retry Search
          </button>
        </div>;
      };

      createEffect(() => {
        const lyrics = lyricsSignal();
        if (!lyrics?.lines) return;
        const timeMs = currentTimeSignal() * 1000;
        let activeIndex = -1;
        for (let i = 0; i < lyrics.lines.length; i++) {
          if (timeMs >= lyrics.lines[i].timeInMs) activeIndex = i;
          else break;
        }
        if (activeIndex !== -1) {
          const activeLine = ui.lines?.querySelector(`.synced-line:nth-child(${activeIndex + 1})`) as HTMLElement;
          activeLine?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      const updateColors = () => {
        try {
          const ctx = ui.canvas?.getContext('2d');
          if (!ctx || !ui.art) return;
          ctx.drawImage(ui.art, 0, 0, 50, 50);
          const data = ctx.getImageData(0, 0, 50, 50).data;
          const getC = (x:number, y:number) => {
             const i = ((y * 50) + x) * 4;
            return `rgb(${data[i]}, ${data[i+1]}, ${data[i+2]})`;
          };
          document.documentElement.style.setProperty('--bfs-c1', getC(25, 25));
          document.documentElement.style.setProperty('--bfs-c2', getC(10, 10));
          document.documentElement.style.setProperty('--bfs-c3', getC(40, 40));
          document.documentElement.style.setProperty('--bfs-c4', getC(40, 10));
          document.documentElement.style.setProperty('--bfs-c5', getC(10, 40));
        } catch(e) {}
      };

      const formatTime = (s: number) => {
        if (isNaN(s)) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
      };

      setInterval(async () => {
        const video = document.querySelector('video');
        if (!video) return;

        const title = (document.querySelector('ytmusic-player-bar .title') as HTMLElement)?.innerText;
        let artist = (document.querySelector('ytmusic-player-bar .byline') as HTMLElement)?.innerText;
        const artSrc = (document.querySelector('.image.ytmusic-player-bar') as HTMLImageElement)?.src;
        if(artist) artist = artist.split(/[•·]/)[0].trim();

        if (ui.title && title) ui.title.innerText = title;
        if (ui.artist && artist) ui.artist.innerText = artist;

        if (ui.art && artSrc) {
           const highRes = artSrc.replace(/w\d+-h\d+/, 'w1200-h1200');
           if (ui.art.src !== highRes) {
             ui.art.src = highRes;
             ui.art.onload = updateColors;
           }
        }

        const currentSrc = video.src;
        if (currentSrc && currentSrc !== lastSrc) {
           lastSrc = currentSrc;
           if (title && artist) {
               setLyricsSignal(null);
           }
        }

        if (isFullscreen) {
          ui.curr!.innerText = formatTime(video.currentTime);
          ui.dur!.innerText = formatTime(video.duration);
          const pct = (video.currentTime / video.duration) * 100;
          ui.fill!.style.width = `${pct}%`;
          setCurrentTimeSignal(video.currentTime);

          if (video.paused) {
            ui.iconPlay!.style.display = 'block';
            ui.iconPause!.style.display = 'none';
          } else {
            ui.iconPlay!.style.display = 'none';
            ui.iconPause!.style.display = 'block';
          }
        }
      }, 250);

      const toggleFS = (active: boolean) => {
        isFullscreen = active;
        if (active) {
          document.body.classList.add('bfs-active');
          document.documentElement.requestFullscreen().catch(()=>{});
        } else {
          document.body.classList.remove('bfs-active');
          if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
        }
      };

      document.getElementById('bfs-close')?.addEventListener('click', () => toggleFS(false));
      window.addEventListener('keydown', e => {
        if(e.key === 'F12') toggleFS(!isFullscreen);
        if(e.key === 'Escape') toggleFS(false);
      });

      ui.settingsBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        ui.settingsModal?.classList.toggle('active');
      });
      ui.container?.addEventListener('click', (e) => {
        if(e.target !== ui.settingsBtn && !ui.settingsModal?.contains(e.target as Node)) {
           ui.settingsModal?.classList.remove('active');
        }
      });

      ui.optSync?.addEventListener('change', (e) => {
        config.perfectSync = (e.target as HTMLInputElement).checked;
        ctx.setConfig({ perfectSync: config.perfectSync, romanize: config.romanize });
      });

      ui.optRoman?.addEventListener('change', async (e) => {
        config.romanize = (e.target as HTMLInputElement).checked;
        ctx.setConfig({ perfectSync: config.perfectSync, romanize: config.romanize });
        setSyncedConfig(prev => prev ? { ...prev, romanization: config.romanize } : prev);
        const title = ui.title?.innerText;
        const artist = ui.artist?.innerText;
        const video = document.querySelector('video');
        if(title && artist && video) {
           ui.lines!.innerHTML = '<div class="bfs-empty">Processing...</div>';
        }
      });

      ui.playBtn?.addEventListener('click', () => { const v=document.querySelector('video'); if(v) v.paused?v.play():v.pause(); });
      ui.prevBtn?.addEventListener('click', () => (document.querySelector('.previous-button') as HTMLElement)?.click());
      ui.nextBtn?.addEventListener('click', () => (document.querySelector('.next-button') as HTMLElement)?.click());
      ui.seek?.addEventListener('click', (e) => {
          const v = document.querySelector('video'); if(!v)return;
          const rect = ui.seek!.getBoundingClientRect();
          v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
      });

      // --- MOVED TO ALBUM ART ---
      setInterval(() => {
        const artContainer = document.querySelector('#song-media-window');
        
        if (artContainer && !document.getElementById('bfs-trigger')) {
          const btn = document.createElement('div');
          btn.id = 'bfs-trigger';
          btn.title = 'Open Lyrics (Better Fullscreen)';
          btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
          
          btn.onclick = (e) => { 
            e.stopPropagation(); 
            toggleFS(true); 
          };
          
          if(getComputedStyle(artContainer).position === 'static') {
             (artContainer as HTMLElement).style.position = 'relative';
          }
          
          artContainer.appendChild(btn);
        }
      }, 1000);
    }
  }
});