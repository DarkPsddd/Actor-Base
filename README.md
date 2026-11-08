# Actor Base

Responsive multi-page movie and actor catalogue with profile editing and bookmarks.

## Run

1. Extract the project.
2. Open a terminal in this folder.
3. Run `python3 -m http.server 8000`.
4. Open `http://localhost:8000`.

Use the local server so the browser shares profile and bookmark storage across all pages. Profile details and saved actors/films are stored in the browser's local storage on this device.

## Pages

- `index.html` — Home
- `movies.html` — film catalogue
- `actors.html` — actor catalogue
- `search.html` — full catalogue
- `profile.html` — editable profile, saved actors and saved films
- `actor-*.html` — individual actor profiles
- `movie-*.html` — individual film pages

Blur and glass effects remain CSS-based. The profile and bookmark features use the small `app.js` file. Some actor portraits load from Wikimedia Commons and require an internet connection.
