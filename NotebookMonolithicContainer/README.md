# Lightweight React Template for KAVIA

This project provides a minimal React template with a clean, modern UI and minimal dependencies.

## Features

- **Lightweight**: No heavy UI frameworks - uses only vanilla CSS and React
- **Modern UI**: Clean, responsive design with KAVIA brand styling
- **Fast**: Minimal dependencies for quick loading times
- **Simple**: Easy to understand and modify
## Getting Started

### Environment Variables

#### For the Frontend (React):
- `REACT_APP_API_URL` (default: `http://localhost:4001`)
  - URL that the frontend uses for all API calls.
  - Example: export REACT_APP_API_URL=http://localhost:4001

#### For the Backend (Express.js):
- `NOTEBOOK_BACKEND_PORT` (default: 4001)
  - Port the Express backend uses.
  - Example: export NOTEBOOK_BACKEND_PORT=4001

### Running Local Development

1. **Start the backend (API + DB):**
   ```bash
   cd NotebookMonolithicContainer/backend
   npm install
   npm start
   ```
   - The backend will listen on port `4001` by default (or as set by `NOTEBOOK_BACKEND_PORT`).

2. **Start the frontend:**
   ```bash
   cd ..
   npm install
   npm start
   ```
   - The React app runs on port `3000` by default.
   - Set `REACT_APP_API_URL` in your environment before running if backend URL/port differs.

   **Tip:** When running backend and frontend separately in local dev, you can set up a proxy (see below).

### Local Proxy Setup (optional, for easier dev)

For local development, you can add the following to your `NotebookMonolithicContainer/package.json` for easier API calls without CORS:

```json
  "proxy": "http://localhost:4001",
```

This allows the React app on port 3000 to automatically proxy `/api/*` to the backend on 4001.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

## Customization

### Colors

The main brand colors are defined as CSS variables in `src/App.css`:

```css
:root {
  --kavia-orange: #E87A41;
  --kavia-dark: #1A1A1A;
  --text-color: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --border-color: rgba(255, 255, 255, 0.1);
}
```

### Components

This template uses pure HTML/CSS components instead of a UI framework. You can find component styles in `src/App.css`. 

Common components include:
- Buttons (`.btn`, `.btn-large`)
- Container (`.container`)
- Navigation (`.navbar`)
- Typography (`.title`, `.subtitle`, `.description`)

## Learn More

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
