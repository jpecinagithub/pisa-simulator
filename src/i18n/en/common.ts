// Seed dictionary — feature dictionaries live in sibling files
// (en/home.ts, en/explorer.ts, …) and are merged in ./index.ts.
// CONTRIBUTORS: create en/<feature>.ts + es/<feature>.ts exporting a nested
// object. Do NOT edit ./index.ts — the integrator wires new files in.
export const common = {
  nav: {
    home: 'Home',
    whatIsPisa: 'What is PISA?',
    history: 'History',
    globalResults: 'Global Results',
    countryExplorer: 'Country Explorer',
    simulator: 'PISA Simulator',
    leaderboard: 'Leaderboard',
    methodology: 'Methodology',
    about: 'About',
  },
  disclaimer: {
    short:
      'This is an independent educational simulator inspired by the OECD PISA assessment framework. It is not affiliated with or endorsed by the OECD. Individual results are estimates and are not official PISA scores.',
  },
  a11y: {
    skipToContent: 'Skip to main content',
    languageSelector: 'Language',
    mainNav: 'Main navigation',
  },
  footer: {
    tagline: 'Understand PISA. Explore the data. Test yourself.',
    author: 'Created by Jon Peciña',
    rights: 'Independent educational project. Not affiliated with the OECD.',
    sourceNote: 'Historical data: OECD PISA.',
  },
  common: {
    noData: 'No data',
    source: 'Source: OECD PISA',
    loading: 'Loading…',
    back: 'Back',
    next: 'Next',
    close: 'Close',
  },
  domains: {
    math: 'Mathematics',
    reading: 'Reading',
    science: 'Science',
  },
} as const;
