import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import copy from 'rollup-plugin-copy';
import html from '@rollup/plugin-html';
import livereload from 'rollup-plugin-livereload';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import postcss from 'rollup-plugin-postcss';
import serve from 'rollup-plugin-serve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const production = !process.env.ROLLUP_WATCH;
const outputPath = path.resolve(__dirname, 'dist');

// Trial for WebGPU
// https://developer.chrome.com/origintrials/#/view_trial/118219490218475521
const originTrial = process.env.WEBGPU_ORIGIN_TRIAL || (
  'AvMV7+QuKgPxuDvjlFx3+twwSmQTXtOiBWJxkIz/C0SdqdDbaYdk6fYULy2nZgs6uu0+ymOmQnAoJDI5JKFfNAoAAABJeyJvcmlnaW4iOiJodHRwOi8vbG9jYWxob3N0OjgwODAiLCJmZWF0dXJlIjoiV2ViR1BVIiwiZXhwaXJ5IjoxNjkxNzExOTk5fQ=='
);

export default {
  input: path.join(__dirname, 'src', 'main.ts'),
  output: {
    dir: outputPath,
    format: 'iife',
    sourcemap: !production,
  },
  plugins: [
    nodeResolve({ extensions: ['.js', '.ts'] }),
    typescript({ sourceMap: !production, inlineSources: !production }),
    postcss({ extract: true, minimize: production }),
    html({
      template: ({ files }) => (
        fs.readFileSync(path.join(__dirname, 'src', 'index.html'), 'utf8')
          .replace('__WEBGPU_ORIGIN_TRIAL__', originTrial)
          .replace(
            '<link rel="stylesheet">',
            (files.css || [])
              .map(({ fileName }) => `<link rel="stylesheet" href="/${fileName}">`)
          )
          .replace(
            '<script></script>',
            (files.js || [])
              .map(({ fileName }) => `<script defer src="/${fileName}"></script>`)
          )
          .replace(/(  |\n)/g, '')
      ),
    }),
    copy({
      copyOnce: true,
      targets: [
        { src: 'favicon.ico', dest: 'dist' },
      ],
    }),
    ...(production ? [
      terser({ format: { comments: false } }),
    ] : [
      serve({
        contentBase: outputPath,
        port: 8080,
      }),
      livereload({
        watch: outputPath,
      }),
    ]),
  ],
  watch: { clearScreen: false },
};
