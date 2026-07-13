const fs = require('fs');

const css = fs.readFileSync('src/index.css', 'utf-8');

const themeInsert = `
  --color-tertiary: #0054a7;
  --color-on-tertiary-fixed-variant: #00468c;
  --color-surface-variant: #e2e2e2;
  --color-on-secondary: #ffffff;
  --color-on-primary: #ffffff;
  --color-surface: #f9f9f9;
  --color-tertiary-container: #246dc8;
  --color-on-tertiary-container: #edf1ff;
  --color-surface-container: #eeeeee;
  --color-secondary-fixed: #ffdf93;
  --color-on-error: #ffffff;
  --color-inverse-on-surface: #f0f1f1;
  --color-surface-tint: #1b6d24;
  --color-background: #f9f9f9;
  --color-surface-container-low: #f3f3f3;
  --color-inverse-surface: #2f3131;
  --color-tertiary-fixed: #d6e3ff;
  --color-on-background: #1a1c1c;
  --color-tertiary-fixed-dim: #a9c7ff;
  --color-surface-bright: #f9f9f9;
  --color-on-secondary-container: #6e5400;
  --color-surface-container-lowest: #ffffff;
  --color-on-primary-fixed: #002204;
  --color-on-secondary-fixed: #241a00;
  --color-on-primary-container: #cbffc2;
  --color-secondary-container: #fdc825;
  --color-secondary: #765b00;
  --color-on-error-container: #93000a;
  --color-error: #ba1a1a;
  --color-primary: #0d631b;
  --color-surface-container-highest: #e2e2e2;
  --color-primary-container: #2e7d32;
  --color-on-surface-variant: #40493d;
  --color-on-primary-fixed-variant: #005312;
  --color-outline-variant: #bfcaba;
  --color-primary-fixed-dim: #88d982;
  --color-surface-container-high: #e8e8e8;
  --color-on-tertiary: #ffffff;
  --color-primary-fixed: #a3f69c;
  --color-on-secondary-fixed-variant: #594400;
  --color-inverse-primary: #88d982;
  --color-on-surface: #1a1c1c;
  --color-surface-dim: #dadada;
  --color-outline: #707a6c;
  --color-secondary-fixed-dim: #f3c01a;
  --color-on-tertiary-fixed: #001b3d;
  --color-error-container: #ffdad6;

  --spacing-margin-desktop: 32px;
  --spacing-xxl: 48px;
  --spacing-sm: 8px;
  --spacing-gutter: 20px;
  --spacing-xs: 4px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-md: 16px;
  --spacing-margin-mobile: 16px;

  --font-body-md: "Plus Jakarta Sans";
  --font-body-lg: "Plus Jakarta Sans";
  --font-label-md: "Plus Jakarta Sans";
  --font-display-lg: "Plus Jakarta Sans";
  --font-headline-lg: "Plus Jakarta Sans";
  --font-headline-md: "Plus Jakarta Sans";
  --font-title-lg: "Plus Jakarta Sans";
`;

const updatedCss = css.replace('@theme {', '@theme {' + themeInsert);

// append some custom classes
const customClasses = `
@layer components {
  .glass-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0px 4px 12px rgba(0,0,0,0.08);
  }
  .standard-card {
    background: #FFFFFF;
    border-radius: 10px;
    box-shadow: 0px 4px 12px rgba(0,0,0,0.08);
  }
  .donut-segment {
    transition: stroke-dashoffset 1s ease-in-out;
  }
}
`;

fs.writeFileSync('src/index.css', updatedCss + customClasses);
