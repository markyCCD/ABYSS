import postcss from "postcss";
import CleanCSS from "clean-css";

import { isDataUri } from "./helpers";

const pluginName = "postcss-font-manifest";

const defaults = {
  formats: ["woff2", "woff"],
  dataUris: false
};

const clean = new CleanCSS();

/**
 * fontManifest function
 * @param  {Object} opts
 * @param  {Root} root
 * @return {Root}
 */
async function fontManifest(opts = {}, root, result) {
  const options = { ...defaults, ...opts };

  const cssFile = root.source.input.file;

  const families = {};
  const faces = {};

  // Find font families in use
  root.walkDecls(/^font(-family)?$/, (decl) => {
    const parent = decl.parent;
    if (parent && parent.type === "rule" && parent.selector) {
      const family = getFirstFontFamily(decl);
      families[family] = true;
    }
  });

  // Find font face definitions
  root.walkAtRules(/font-face/, (rule) => {
    const { formats, dataUris } = options;

    const css = clean.minify(rule.toString()).styles;
    const family = getDeclarationValue(rule, "font-family");
    const weight = getDeclarationValue(rule, "font-weight") || "normal";
    const style = getDeclarationValue(rule, "font-style") || "normal";
    const src = getDeclarationValue(rule, "src");
    const file = getFontFileByFormat(src, formats);

    if (file) {
      const { format, url } = file;
      // Skip data URIs unless configured to included
      if (!dataUris && isDataUri(url)) {
        return
      }
      // prettier-ignore
      faces[url] = { family, weight, style, format, url, src, css };
    } else {
      console.warn(`No matching sources found for ${family}`, "\n");
    }
  });

  // Remove unused font faces
  const usedFaces = Object.entries(faces).reduce((acc, [key, face]) => {
    if (face.family && families[face.family]) {
      acc[key] = face;
    }
    return acc;
  }, {});

  // Add info to result object
  result.messages.push({
    type: "font-manifest",
    plugin: pluginName,
    fonts: usedFaces,
  });
}

export const extractFontManifestResult = (result) => {
  const message = result.messages.find((m) => m.type === "font-manifest");
  return message ? message.fonts : null;
};

const getQuoteless = (str) => str.replace(/^(['"])(.+)\1$/g, "$2");

const getDeclarationValue = (rule, property) => {
  let result = "";
  for (const declaration of rule.nodes) {
    if (declaration.prop === property) {
      result = getQuoteless(declaration.value);
    }
  }
  return result;
};

const getFirstFontFamily = (decl) =>
  getQuoteless(
    postcss.list.space(postcss.list.comma(decl.value)[0]).slice(-1)[0]
  );

const getFontFileByFormat = (srcString, formats) => {
  const sources = postcss.list.comma(srcString);
  const files = sources.map(getFontUrlAndFormat);
  const matchingFiles = files
    .filter((file) => formats.includes(file.format))
    .sort((a, b) => formats.indexOf(a.format) - formats.indexOf(b.format));
  return matchingFiles[0] || null;
};

const getFontUrlAndFormat = (fontSrc) => {
  const formatPattern = /url\(["']?([\w\W]+?)["']?\)\s+format\(["']?([\w]+)["']?\)/;
  const match = formatPattern.exec(fontSrc);
  if (match) {
    const [, url, format] = match;
    return { url, format };
  }
  return {};
};

const getPluginWithInitialParams = (options) =>
  fontManifest.bind(null, options);

export default postcss.plugin(pluginName, (options = {}) =>
  getPluginWithInitialParams(options)
);
