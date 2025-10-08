# LunaSleep - Sleep Tracker

LunaSleep is a polished, responsive sleep tracker built by [Teda.dev](https://teda.dev), the simplest AI app builder for regular people. It captures bedtime, wake time, sleep quality, and notes. All data is stored in your browser using localStorage so your logs persist across reloads. You can export and import logs as JSON for backup or transfer.

Features
- Add sleep logs with date, bedtime, wake time, quality, and notes.
- Automatic duration calculation that accounts for wake on the next day.
- Visual summary cards for average sleep, average quality, longest sleep, and current streak.
- Simple bar chart for the last 14 days.
- Edit or delete logs. Import, export, and load sample data.
- Fully responsive and accessible with keyboard navigation and reduced motion support.

Tech stack and structure
- HTML5, Tailwind CSS via CDN, jQuery 3.7.x for DOM and events.
- Modular JavaScript split into scripts/helpers.js, scripts/ui.js, scripts/main.js.
- Custom styles in styles/main.css.

Getting started
1. Open index.html in a modern browser.
2. Add a log using the form. Use Quick: Now as Wake to quickly set the wake time.
3. Export your data to back up, or import a JSON file to restore logs.

Files
- index.html - main entry and UI
- styles/main.css - custom CSS
- scripts/helpers.js - utilities and localStorage wrapper
- scripts/ui.js - UI rendering and event binding. Exposes window.App.init and window.App.render
- scripts/main.js - initialization guard and entry

Accessibility
- Semantic HTML and ARIA where appropriate
- Focus visible styles and keyboard operability
- Prefers reduced motion respected

License
MIT
