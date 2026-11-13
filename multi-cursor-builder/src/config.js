/* Load before boot.js and builder.js. No JSON fetch required. */
window.CursorBuilderConfig = {
  "version": "1.0.0",
  "durationMs": 1500,
  "departureGapMs": 100,
  "poolSize": 12,
  "activeCounts": {
    "desktop": 12,
    "tablet": 10,
    "phone": 7
  },
  "selectors": [
    "[data-build]"
  ],
  "dialogSelector": "dialog",
  "parking": {
    "gapPx": 14,
    "rightPx": 28,
    "overlapOffsetPx": 4,
    "returnMs": 440,
    "resizeMs": 380
  },
  "colors": [
    "#97e9c0",
    "#9ab7ff",
    "#ffbb8d",
    "#ceb0ff",
    "#e9ed83",
    "#f3a3c3",
    "#80d8eb",
    "#d0f77c",
    "#ff9c9c",
    "#8fb8ea",
    "#ddbe8e",
    "#9dd8af"
  ]
};
