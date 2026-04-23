# Copilot Instructions

## Commands

- `yarn install` installs the only root Node dependencies (`playwright` and `fs-extra`).
- `node go-fetch.js` runs the Playwright-based capture script that saves same-origin static assets into `public/`.
- `package.json` does not define build, test, or lint scripts, and there are no checked-in test files.

## High-level architecture

- This repository is an offline reconstruction of the AALAS Learning Library frontend, not a source-first app with a bundler. The checked-in app runs directly from static files under `public/`.
- `go-fetch.js` is the acquisition utility for phase 1. The README also describes planned API-capture and local mock-server phases, but those files are not implemented in this repo yet.
- The runtime entry points are `public/index.html` and `public/login/signin.html`. Both bootstrap the AngularJS 1.x app `clipApp`, which wraps the base module `clip-two`.
- `public/index.html` loads scripts directly from `public/bower_components` and `public/assets/js`; there is no webpack/vite/parcel step. Changes must be wired through script tags or Angular lazy-loading, not a bundler config.
- Routing lives in `public/assets/js/config.router.js`. It enables `$locationProvider.html5Mode(...)`, and the HTML entrypoints use `<base href="/">`, so any local server must serve the SPA on deep links and keep API endpoints available at root-relative paths.
- The abstract `app` state loads `mainService` and calls `mainService.getSubscriptionInfo()` before child routes render. `mainService` then acts as shared session state for catalog, membership, assignments, roles, and subscription data across controllers.
- Course consumption is implemented once and reused across several parallel state trees: `app.library`, `app.track`, `app.customCourse`, `app.free`, `app.race`, and `app.authoring.review` all point to the same course/lesson/page/exam controllers and templates.

## Key conventions

- Route dependencies are name-based. `loadSequence(...)` in `config.router.js` resolves strings through `JS_REQUIRES` in `public/assets/js/config.constant.js`, so adding or renaming a route-loaded controller/service/plugin requires updating both files.
- API calls are intentionally root-relative. `config.constant.js` sets `serviceBase = '/'`, and services call endpoints such as `/token` and `/api/...`. Keep mock-server work compatible with those URLs instead of inventing a new prefix.
- Authentication state lives in `$sessionStorage.authorizationData`. `authInterceptorService` adds `Authorization: Bearer ...` for normal `$http` requests, but authoring uploads also set that header manually in `public/assets/js/controllers/authoring/editPageCtrl.js`.
- Controllers generally use `controllerAs: "view"` with `var vm = this`. Shared services keep long-lived mutable objects/arrays and update them with `angular.copy(...)`; preserve object identity instead of replacing those service fields outright.
- Several controllers derive navigation targets from `$state.current.parent` and then append child state names like `.course`, `.lesson`, `.page`, `.exam`, and `.question`. If you add a new content scope, mirror those child state names or existing navigation helpers will break.
- This extraction is incomplete. `config.router.js` and `JS_REQUIRES` still reference many templates/controllers from the original site, but `public/assets/views/` is not present in the current checkout and many referenced JS files are also missing. Check the filesystem before assuming a route target exists.
- Many extracted files are minified or flattened into one-line snapshots. Prefer surgical edits over broad reformatting so route aliases, script names, and upstream-derived diffs stay easy to audit.
- If you are changing offline behavior, inspect both HTML shells: `public/index.html` already has some third-party integrations commented out, while `public/login/signin.html` still loads more live external assets.
