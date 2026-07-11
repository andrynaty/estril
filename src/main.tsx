import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Monkeypatch window.getComputedStyle to translate oklch() and oklab() values to rgb()/rgba()
// This completely fixes Framer Motion crash/warning with Tailwind v4 color variables.
(function patchGetComputedStyle() {
  if (typeof window === 'undefined') return;

  function oklabToRgb(L: number, a: number, b: number, aStr: string = '1'): string {
    if (isNaN(L) || isNaN(a) || isNaN(b)) {
      return 'rgb(120, 120, 120)';
    }
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    const rL = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const gL = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bL = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    const gamma = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    const finalR = Math.max(0, Math.min(255, Math.round(gamma(rL) * 255)));
    const finalG = Math.max(0, Math.min(255, Math.round(gamma(gL) * 255)));
    const finalB = Math.max(0, Math.min(255, Math.round(gamma(bL) * 255)));
    let alpha = 1;
    if (aStr) {
      if (aStr.includes('%')) alpha = parseFloat(aStr) / 100;
      else alpha = parseFloat(aStr);
      if (isNaN(alpha)) alpha = 1;
    }
    if (alpha < 1) return `rgba(${finalR}, ${finalG}, ${finalB}, ${alpha.toFixed(3)})`;
    return `rgb(${finalR}, ${finalG}, ${finalB})`;
  }

  function oklchToRgb(lStr: string, cStr: string, hStr: string, aStr: string = '1'): string {
    let L = parseFloat(lStr); if (lStr.includes('%')) L = L / 100;
    let C = parseFloat(cStr); if (cStr.includes('%')) C = C / 100;
    let H = parseFloat(hStr);
    if (hStr.includes('rad')) H = (parseFloat(hStr) * 180) / Math.PI;
    else if (hStr.includes('turn')) H = parseFloat(hStr) * 360;
    if (isNaN(L) || isNaN(C) || isNaN(H)) return 'rgb(120, 120, 120)';
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    return oklabToRgb(L, a, b, aStr);
  }

  function replaceOklchAndOklab(str: string): string {
    if (typeof str !== 'string') return str;
    let converted = str.replace(/oklch\(((?:[^()]+|\([^()]*\))*)\)/g, (match, inner) => {
      const parts = inner.trim().split(/[\s,/\\]+/);
      if (parts.length >= 3) {
        return oklchToRgb(parts[0], parts[1], parts[2], parts[3] || '1');
      }
      return 'rgb(120, 120, 120)';
    });
    converted = converted.replace(/oklab\(((?:[^()]+|\([^()]*\))*)\)/g, (match, inner) => {
      const parts = inner.trim().split(/[\s,/\\]+/);
      if (parts.length >= 3) {
        let L = parseFloat(parts[0]); if (parts[0].includes('%')) L /= 100;
        let a = parseFloat(parts[1]); if (parts[1].includes('%')) a /= 100;
        let b = parseFloat(parts[2]); if (parts[2].includes('%')) b /= 100;
        return oklabToRgb(L, a, b, parts[3] || '1');
      }
      return 'rgb(120, 120, 120)';
    });
    return converted;
  }

  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (el, pseudo) {
    const style = originalGetComputedStyle.call(this, el, pseudo);
    if (!style) return style;
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') {
          if (prop === 'getPropertyValue') {
            return function (p: string) {
              const val = target.getPropertyValue(p);
              if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                return replaceOklchAndOklab(val);
              }
              return val;
            };
          }
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
            return replaceOklchAndOklab(val);
          }
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
        return Reflect.get(target, prop, receiver);
      }
    });
  };
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
