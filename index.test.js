import postcss from "postcss";

import Plugin from "./cjs";
import { isStylesheet } from "./helpers";
import postCssFontManifestPlugin, { extractFontManifestResult } from "./postcss";

const generateManifest = async (css, opts = null) => {
  const processor = postcss([postCssFontManifestPlugin(opts)]);
  const result = await processor.process(css, { from: undefined });
  const manifest = extractFontManifestResult(result);
  return manifest;
};

test("should set options property", () => {
  const options = {
    test: "hello",
  };
  const plugin = new Plugin(options);
  expect(plugin.options).toBe(options);
});

test("should recognize css files by filename", () => {
  const stylesheets = [
    'stylesheet.css',
    '/some/stylesheet.css',
    '/some/stylesheet.CSS',
    '/some/stylesheet.css?param',
  ];
  const result = stylesheets.filter(isStylesheet);
  expect(result).toEqual(stylesheets);
});

test("should discard non-css files by filename", () => {
  const notStylesheets = [
    '/some/text.css.zip',
    '/some/text.cssx'
  ];
  const result = notStylesheets.filter(isStylesheet)
  expect(result).toEqual([]);
});

test("should parse font-face information", async () => {
  const css = `
    @font-face {
      font-family: 'Font A';
      src: url(/fonts/a.woff2) format('woff2');
    }
    body {
      font-family: 'Font A';
    }
  `;
  const manifest = await generateManifest(css);

  expect(manifest).toHaveProperty(['/fonts/a.woff2']);
  expect(manifest).toHaveProperty(['/fonts/a.woff2', 'family'], 'Font A');
  expect(manifest).toHaveProperty(['/fonts/a.woff2', 'format'], 'woff2');
  expect(manifest).toHaveProperty(['/fonts/a.woff2', 'url'], '/fonts/a.woff2');
});

test("should ignore un-used font-faces", async () => {
  const css = `
    @font-face {
      font-family: 'Font A';
      src: url(a.woff2) format('woff2');
    }
    @font-face {
      font-family: 'Font A';
      src: url(a.woff2) format('woff2');
    }
    body {
      font-family: 'Font B';
    }
    @media {
      font-family: 'Font A';
    }
    font-family: 'Font A';
  `;
  const manifest = await generateManifest(css);

  expect(manifest).not.toHaveProperty(['a.woff2']);
});

test("should prefer woff2 format", async () => {
  const css = `
    @font-face {
      font-family: 'Font A';
      src: url(a.woff) format('woff'), url(a.woff2) format('woff2');
    }
    body {
      font-family: 'Font A';
    }
  `;
  const manifest = await generateManifest(css);

  expect(manifest).toHaveProperty(['a.woff2']);
  expect(manifest).not.toHaveProperty(['a.woff']);
});

test("should make preferred format configurable", async () => {
  const options = { formats: ['woff', 'woff2'] };
  const css = `
    @font-face {
      font-family: 'Font A';
      src: url(a.woff2) format('woff2'), url(a.woff) format('woff');
    }
    body {
      font-family: 'Font A';
    }
  `;
  const manifest = await generateManifest(css, options);

  expect(manifest).toHaveProperty(['a.woff']);
  expect(manifest).not.toHaveProperty(['a.woff2']);
});

test("should exclude data URI fonts by default", async () => {
  const options = { };
  const css = `
    @font-face {
      font-family: 'Font A';
      src: url(data:application/font-woff;base64,abcd) format('woff2'), url(a.woff) format('woff');
    }
    body {
      font-family: 'Font A';
    }
  `;
  const manifest = await generateManifest(css, options);

  expect(manifest).not.toHaveProperty(['data:application/font-woff;base64,abcd']);
});

test("should allow including data URI font", async () => {
  const options = { dataUris: true };
  const css = `
    @font-face {
      font-family: 'Font A';
      src: url(data:application/font-woff;base64,abcd) format('woff2'), url(a.woff) format('woff');
    }
    body {
      font-family: 'Font A';
    }
  `;
  const manifest = await generateManifest(css, options);

  expect(manifest).toHaveProperty(['data:application/font-woff;base64,abcd']);
});
