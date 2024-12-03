import postcss from "postcss";

import { isStylesheet } from "./helpers";
import postCssFontManifestPlugin, { extractFontManifestResult } from "./postcss";

const pluginName = "FontManifest";

export default class FontManifestPlugin {
  constructor(options = {}) {
    this.purgedStats = {};
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap(
      pluginName,
      this.initializePlugin.bind(this)
    );
  }

  initializePlugin(compilation) {
    compilation.hooks.additionalAssets.tapPromise(pluginName, () => {
      return this.runPluginHook(compilation);
    });
  }

  async runPluginHook(compilation) {
    const processor = postcss([postCssFontManifestPlugin(this.options)]);
    const processingPromises = [];

    const assetsFromCompilation = Object.entries(compilation.assets).filter(
      ([name]) => isStylesheet(name)
    );
    for (const chunk of compilation.chunks) {
      const assetsToProcess = assetsFromCompilation.filter(([name]) => {
        if (this.options.only) {
          return this.options.only.some((only) => name.includes(only));
        }
        return Array.isArray(chunk.files)
          ? chunk.files.includes(name)
          : chunk.files.has(name);
      });

      for (const [name, asset] of assetsToProcess) {
        const css = asset.source().toString();
        processingPromises.push(processor.process(css, { from: name }));
      }
    }

    const results = await Promise.all(processingPromises);

    const manifest = results.reduce((acc, result) => {
      const fonts = extractFontManifestResult(result)
      return fonts ? { ...acc, ...fonts } : acc;
    }, {});

    const manifestJson = JSON.stringify(manifest);

    compilation.assets["font-manifest.json"] = {
      source: () => manifestJson,
      size: () => manifestJson.length,
    };
  }
}
