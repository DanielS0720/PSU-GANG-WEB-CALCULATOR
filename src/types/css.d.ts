// Ambient declarations so TypeScript accepts side-effect CSS imports
// (e.g. `import "./globals.css"`) in every editor, independent of when
// Next regenerates next-env.d.ts. Silences TS2882.
declare module "*.css";
declare module "*.scss";
