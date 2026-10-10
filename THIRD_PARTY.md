# Third-party code

The API hooks, formatting utilities, historical charts, flags and shared UI components are adapted from [monitor-theme-default](https://github.com/monitor-probe/monitor-theme-default), revision `2719bc51bef64f56ed78c5101e17447a529f64e4`, under its MIT license. The upstream copyright notice is preserved in LICENSE.

The advertisement homepage, cards, styles, configuration validation, developer fixtures and deployment/packaging helpers are developed for monitor-theme-guangao. Dependencies retain their own licenses.

The bundled `public/fonts/monitor-note.woff2` is a renamed subset of [Long Cang](https://github.com/google/fonts/tree/main/ofl/longcang), licensed under SIL Open Font License 1.1. Its complete license is in `public/fonts/OFL.txt`, also distributed inside `dist/fonts/OFL.txt`. The subset covers built-in node remarks, calculator labels and exports, Latin characters and labeled demo notes; other characters use the system handwriting fallback. Rebuild it with `scripts/subset-note-font.py` after changing built-in phrases.
