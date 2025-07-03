// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {}, // Use the new PostCSS plugin here
    // If you still need autoprefixer, you might add it back explicitly:
    // 'autoprefixer': {},
    // ... any other PostCSS plugins
  },
};