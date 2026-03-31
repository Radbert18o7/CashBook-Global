module.exports = function (api) {
  api.cache(true);
  // `nativewind/babel` is a preset (returns `{ plugins: [...] }`). Listing it under
  // `plugins` breaks Babel validation and breaks `expo export` / static web builds.
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
