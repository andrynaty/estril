from __future__ import annotations

from pathlib import Path
import re


def srgb_to_linear(value: int) -> float:
    channel = value / 255
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def luminance(hex_color: str) -> float:
    color = hex_color.lstrip('#')
    if len(color) == 3:
        color = ''.join(ch * 2 for ch in color)
    rgb = [int(color[i:i + 2], 16) for i in (0, 2, 4)]
    r, g, b = [srgb_to_linear(channel) for channel in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(foreground: str, background: str) -> float:
    first, second = luminance(foreground), luminance(background)
    lighter, darker = max(first, second), min(first, second)
    return (lighter + 0.05) / (darker + 0.05)

pairs = [
    ('#193326', '#f4fbf6', 'body text on page background'),
    ('#294536', '#ffffff', 'primary text on cards'),
    ('#617568', '#ffffff', 'secondary text on cards'),
    ('#ffffff', '#116b46', 'white button text on primary green'),
    ('#ffffff', '#116b46', 'white button text on hover green'),
    ('#ffffff', '#237b52', 'white table header text on green'),
    ('#8a5b00', '#fff8e8', 'warning text on warning background'),
    ('#b33f55', '#fff1f3', 'error text on error background'),
    ('#16734a', '#edf9f0', 'success text on success background'),
    ('#53685a', '#ffffff', 'muted text on white'),
    ('#166534', '#f4fbf5', 'section title on soft green'),
]

print('| Pair | Ratio | AA normal | AA large | AAA normal |')
print('|---|---:|:---:|:---:|:---:|')
for fg, bg, label in pairs:
    ratio = contrast(fg, bg)
    print(f'| {label} ({fg} / {bg}) | {ratio:.2f}:1 | {"PASS" if ratio >= 4.5 else "FAIL"} | {"PASS" if ratio >= 3 else "FAIL"} | {"PASS" if ratio >= 7 else "FAIL"} |')

css = Path('/home/ubuntu/estril/src/index.css').read_text()
colors = sorted(set(re.findall(r'#[0-9A-Fa-f]{6}', css)))
print('\nReferenced six-digit colors:', len(colors))
print(', '.join(colors[:80]))
