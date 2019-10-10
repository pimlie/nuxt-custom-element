'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));
var path = require('path');
var path__default = _interopDefault(path);
var consola = _interopDefault(require('consola'));
var defu = _interopDefault(require('defu'));
var serveStatic = _interopDefault(require('serve-static'));
var coreEdge = require('@nuxt/core-edge');
var klaw = _interopDefault(require('klaw'));
var fsExtra = require('fs-extra');
var cliEdge = require('@nuxt/cli-edge');
var inquirer = _interopDefault(require('inquirer'));

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function exists(p) {
  return new Promise((resolve, reject) => {
    fs.access(p, fs.constants.F_OK, err => {
      if (err) {
        resolve(false);
        return;
      }

      resolve(true);
    });
  });
}
function createFileFilter(filter) {
  if (!filter) {
    return;
  }

  if (filter instanceof RegExp) {
    return path => filter.test(path);
  }

  if (typeof filter === 'string') {
    return path => path.includes(filter);
  }

  return filter;
}
function walk(dir, {
  validate,
  sliceRoot = true
} = {}) {
  const matches = [];
  let sliceAt;

  if (sliceRoot) {
    if (sliceRoot === true) {
      sliceRoot = dir;
    }

    sliceAt = sliceRoot.length + (sliceRoot.endsWith('/') ? 0 : 1);
  }

  validate = createFileFilter(validate);
  return new Promise(resolve => {
    klaw(dir).on('data', match => {
      const path = sliceAt ? match.path.slice(sliceAt) : match.path;

      if (!path.includes('node_modules') && (!validate || validate(path))) {
        matches.push(path);
      }
    }).on('end', () => resolve(matches));
  });
}

function abstractGuard(target, className) {
  if (target === className) {
    throw new Error(`${className} is an abstract class, do not instantiate it directly`);
  }
}
function runOnceGuard(instance, name) {
  if (!instance._runGuards) {
    instance._runGuards = {};
  }

  if (instance._runGuards[name]) {
    return false;
  }

  instance._runGuards[name] = true;
  return true;
}
function runOnceGuardBlocking(instance, name) {
  if (!instance._runGuards) {
    instance._runGuards = {};
  }

  if (instance._runGuards[name] === true) {
    return Promise.resolve(false);
  }

  if (instance._runGuards[name]) {
    return new Promise(resolve => {
      instance._runGuards[name].push(() => resolve(false));
    });
  }

  instance._runGuards[name] = [];
  return Promise.resolve(() => {
    instance._runGuards[name].forEach(r => r());

    instance._runGuards[name] = true;
  });
}

function ucfirst(str) {
  str = str || '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const defaultOptions = {
  autodiscover: true,
  pluginsStrategy: 'unshift'
};
class Blueprint extends coreEdge.Module {
  constructor(nuxt, options = {}) {
    // singleton blueprints dont support being loaded twice
    if (new.target.features.singleton && !runOnceGuard(new.target, 'constructed')) {
      throw new Error(`${new.target.name}: trying to load a singleton blueprint which is already loaded`);
    }

    super(nuxt);
    this.id = options.id || this.constructor.id || 'blueprint';
    this.blueprintOptions = defu(options, defaultOptions);
    this.templateOptions = this.blueprintOptions;
  }

  setup() {
    if (!runOnceGuard(Blueprint, 'setup')) {
      return;
    }

    const webpackAliases = this.blueprintOptions.webpackAliases;

    if (webpackAliases) {
      this.extendBuild(config => {
        const aliases = [];

        if (webpackAliases === true) {
          aliases.push(this.id);
        } else if (typeof webpackAliases === 'string') {
          aliases.push(webpackAliases);
        } else {
          aliases.push(...webpackAliases);
        }

        for (const alias of aliases) {
          if (Array.isArray(alias)) {
            const [_alias, _path] = alias;
            config.resolve.alias[_alias] = _path;
          } else {
            config.resolve.alias[alias] = path__default.join(this.nuxt.options.buildDir, alias);
          }
        }
      });
    }
  }

  async init(files) {
    this.setup(); // static files need to be added immediately
    // because otherwise the serveStatic middleware
    // is added after the server has already started listening

    if (files && files.static) {
      await this.resolveFiles({
        static: files.static
      });
      delete files.static;
    }

    this.nuxt.hook('builder:prepared', async () => {
      if (this.blueprintOptions.autodiscover) {
        const autodiscoveredFiles = await this.autodiscover();
        await this.resolveFiles(autodiscoveredFiles);
      }

      if (files) {
        await this.resolveFiles(files);
      }
    });
  }

  createTemplatePaths(filePath, rootDir, prefix) {
    if (typeof filePath !== 'string') {
      return filePath;
    }

    let src = filePath;

    if (!path__default.isAbsolute(filePath)) {
      rootDir = rootDir || this.blueprintOptions.dir;
      src = path__default.join(rootDir, filePath);
    }

    return {
      src,
      dst: prefix ? path__default.join(prefix || '', filePath) : filePath,
      dstRelative: filePath
    };
  }

  static autodiscover(...args) {
    return new Blueprint({}).autodiscover(...args);
  }

  async autodiscover(rootDir, {
    validate,
    filter
  } = {}) {
    rootDir = rootDir || this.blueprintOptions.dir;
    filter = filter || this.blueprintOptions.filter;
    validate = validate || this.blueprintOptions.validate;

    if (!rootDir || !(await exists(rootDir))) {
      return {};
    }

    filter = createFileFilter(filter);
    const files = await walk(rootDir, {
      validate
    });
    const filesByType = {};

    for (const file of files) {
      if (!file) {
        continue;
      }

      const parsedFile = path__default.parse(file); // TODO: fix sub folders

      const {
        dir,
        ext
      } = parsedFile;
      const [type] = dir.split(path__default.sep); // dont add anything without an extension -> not a proper file

      if (!type && !ext) {
        continue;
      } // filter files


      if (filter && !filter(parsedFile)) {
        continue;
      }

      filesByType[type] = filesByType[type] || [];
      filesByType[type].push(this.createTemplatePaths(file, rootDir));
    }

    return filesByType;
  }

  resolveAppPath({
    dstRelative
  }) {
    const nuxtOptions = this.nuxt.options;
    return path__default.join(nuxtOptions.srcDir, nuxtOptions.dir.app, this.id, dstRelative);
  }

  async resolveAppOverrides(templates) {
    // Early return if the main app dir doesnt exists
    const appDir = this.resolveAppPath({
      dstRelative: ''
    });

    if (!(await exists(appDir))) {
      return templates;
    }

    return Promise.all(templates.map(async paths => {
      // Use ejected template from nuxt's app dir if it exists
      const appPath = this.resolveAppPath(paths);

      if (await exists(appPath)) {
        paths.src = appPath;
      }

      return paths;
    }));
  }

  getPathPrefix(pathPrefix) {
    return pathPrefix || this.id;
  }

  async resolveFiles(files, pathPrefix) {
    pathPrefix = this.getPathPrefix(pathPrefix); // use an instance var to keep track
    // of final template src/dst mappings

    this.filesMapping = {};

    for (const type in files) {
      let typeFiles = files[type].map(file => {
        if (typeof file === 'string') {
          return this.createTemplatePaths(file, undefined, pathPrefix);
        }

        return { ...file,
          dst: path__default.join(pathPrefix, file.dst),
          dstRelative: file.dst
        };
      });
      typeFiles = await this.resolveAppOverrides(typeFiles); // Turns 'modules' into 'addModules'

      const methodName = `add${ucfirst(type)}`; // If methodName function exists that means there are
      // files with a special meaning for Nuxt.js (ie modules, plugins)

      if (this[methodName]) {
        await this[methodName](typeFiles);
        continue;
      } // The files are just some generic js/vue files, but can be templates


      await this.addFiles(typeFiles, type);
    } // convert absolute paths in fileMapping
    // to relative paths from the nuxt.buildDir
    // this also creates a copy of filesMapping in the process
    // so successive resolveFiles calls dont overwrite the
    // same object already returned to the user


    const relativeFilesMapping = {};

    for (const key in this.filesMapping) {
      const filePath = this.filesMapping[key];

      if (path__default.isAbsolute(filePath)) {
        relativeFilesMapping[key] = path__default.relative(this.nuxt.options.buildDir, filePath);
        continue;
      }

      relativeFilesMapping[key] = filePath;
    }

    return relativeFilesMapping;
  }

  async copyFile({
    src,
    dst
  }) {
    if (!src) {
      return;
    }

    if (!path__default.isAbsolute(dst)) {
      dst = path__default.join(this.nuxt.options.buildDir, dst);
    }

    try {
      consola.debug(`${this.constructor.name}: Copying '${path__default.relative(this.nuxt.options.srcDir, src)}' to '${path__default.relative(this.nuxt.options.buildDir, dst)}'`);
      await fsExtra.ensureDir(path__default.dirname(dst));
      await fsExtra.copyFile(src, dst, fs.constants.COPYFILE_FICLONE);
      return dst;
    } catch (err) {
      consola.error(`${this.constructor.name}: An error occured while copying '${path__default.relative(this.nuxt.options.srcDir, src)}' to '${path__default.relative(this.nuxt.options.buildDir, dst)}'\n`, err);
      return false;
    }
  }

  addTemplateIfNeeded({
    src,
    dst,
    dstRelative
  } = {}) {
    if (!src) {
      return;
    }

    const templateSuffices = ['tmpl', '$tmpl', 'template', '$template'];
    let templatePath;

    for (const suffix of templateSuffices) {
      if (src.includes(`.${suffix}.`)) {
        // if user provided a custom dst, use that
        if (!src.endsWith(dstRelative)) {
          templatePath = dst;
          break;
        }

        const {
          name,
          ext
        } = path__default.parse(src); // if template suffix starts with $
        // create a unique but predictable name by replacing
        // the template indicator by this.id
        // TODO: normalize id?

        const id = suffix[0] === '$' ? `.${this.id}` : '';
        templatePath = path__default.join(path__default.dirname(dst), `${path__default.basename(name, `.${suffix}`)}${id}${ext}`);
        break;
      }
    } // its a template


    if (templatePath) {
      const {
        dst: templateDst
      } = this.addTemplate({
        src,
        fileName: templatePath,
        options: this.templateOptions
      });
      this.filesMapping[dstRelative] = templateDst;
      return templateDst;
    }

    this.filesMapping[dstRelative] = src;
    return src;
  }

  async addTemplateOrCopy({
    src,
    dst,
    dstRelative
  } = {}) {
    const dest = this.addTemplateIfNeeded({
      src,
      dst,
      dstRelative
    });

    if (dest === src) {
      await this.copyFile({
        src,
        dst
      });
      return dst;
    }

    return dest;
  }

  addFiles(files, type) {
    return Promise.all(files.map(file => this.addTemplateOrCopy(file)));
  }

  addAssets(assets) {
    // TODO: run addAssets more than once while adding just one plugin
    // or set unique webpack plugin name
    const emitAssets = compilation => {
      // Note: the order in which assets are emitted is not stable

      /* istanbul ignore next */
      return Promise.all(assets.map(async ({
        src,
        dst
      }) => {
        const assetBuffer = await fsExtra.readFile(src);
        compilation.assets[dst] = {
          source: () => assetBuffer,
          size: () => assetBuffer.length
        };
      }));
    }; // add webpack plugin


    this.nuxt.options.build.plugins.push({
      apply(compiler) {
        /* istanbul ignore next */
        compiler.hooks.emit.tapPromise(`${this.id}BlueprintPlugin`, emitAssets);
      }

    });
  }

  async addLayouts(layouts) {
    for (const layout of layouts) {
      const layoutPath = await this.addTemplateOrCopy(layout);
      const {
        name: layoutName
      } = path__default.parse(layoutPath);
      const existingLayout = this.nuxt.options.layouts[layoutName];

      if (existingLayout) {
        consola.warn(`Duplicate layout registration, "${layoutName}" has been registered as "${existingLayout}"`);
        continue;
      } // Add to nuxt layouts


      this.nuxt.options.layouts[layoutName] = `./${layoutPath}`;
    }
  }

  async addModules(modules) {
    for (const module of modules) {
      const modulePath = this.addTemplateIfNeeded(module);
      await this.addModule(modulePath);
    }
  }

  async addPlugins(plugins) {
    const newPlugins = []; // dont use addPlugin here due to its addTemplate use

    for (const plugin of plugins) {
      const pluginPath = await this.addTemplateOrCopy(plugin); // Add to nuxt plugins

      newPlugins.push({
        src: path__default.join(this.nuxt.options.buildDir, pluginPath),
        // TODO: remove deprecated option in Nuxt 3
        ssr: plugin.ssr,
        mode: plugin.mode
      });
    } // nuxt default behaviour is to put new plugins
    // at the front of the array, so thats what we
    // want do as well. But we want to maintain
    // order of the files
    // TODO: check if walk is stable in the order of resolving files


    const pluginsStrategy = this.blueprintOptions.pluginsStrategy;

    if (typeof pluginsStrategy === 'function') {
      pluginsStrategy(this.nuxt.options.plugins, newPlugins);
      return;
    }

    if (!this.nuxt.options.plugins[pluginsStrategy]) {
      throw new Error(`Unsupported plugin strategy ${pluginsStrategy}`);
    }

    this.nuxt.options.plugins[pluginsStrategy](...newPlugins);
  }

  async addStatic(staticFiles) {
    /* istanbul ignore next */
    const files = await Promise.all(staticFiles.map(file => {
      return this.addTemplateOrCopy(file);
    }));
    const staticMiddleware = serveStatic(path__default.resolve(this.nuxt.options.buildDir, path__default.dirname(files[0])), this.nuxt.options.render.static);
    staticMiddleware.prefix = this.nuxt.options.render.static.prefix;
    this.addServerMiddleware(staticMiddleware);
  }

  addStyles(stylesheets) {
    for (let stylesheet of stylesheets) {
      if (typeof stylesheet === 'object') {
        stylesheet = this.addTemplateIfNeeded(stylesheet);
      }

      if (stylesheet && !this.nuxt.options.css.includes(stylesheet)) {
        this.nuxt.options.css.push(stylesheet);
      }
    }
  }

  addApp(appFiles) {
    return Promise.all(appFiles.map(({
      src,
      dst
    }) => {
      return this.addTemplate({
        src,
        // dst has blueprint id and app dir name added, remove those
        // eg dst: blueprint/app/router.js -> router.js
        fileName: dst.substr(dst.indexOf('app') + 4)
      });
    }));
  }

  addStore() {
    consola.warn(`${this.constructor.name}: adding store modules from blueprints is not (yet) implemented`);
  }

}

_defineProperty(Blueprint, "features", {});

async function ejectTemplates(nuxt, options, templates) {
  const {
    name,
    appDir
  } = options;
  const resolvedAppDir = path.join(nuxt.options.srcDir, nuxt.options.dir.app, appDir || name);
  await fsExtra.ensureDir(resolvedAppDir);
  await Promise.all(templates.map(template => ejectTemplate(nuxt, options, template, resolvedAppDir)));
}
async function ejectTemplate(nuxt, {
  name,
  appDir
}, {
  src,
  dst
}, resolvedAppDir) {
  if (!resolvedAppDir) {
    resolvedAppDir = path.join(nuxt.options.srcDir, nuxt.options.dir.app, appDir || name);
  }

  const dstFile = path.join(resolvedAppDir, dst);
  consola.debug(`Ejecting template '${src}' to '${dstFile}'`);
  const content = await fsExtra.readFile(src);

  if (!content) {
    consola.warn(`Reading source template file returned empty content, eject aborted for: ${path.relative(nuxt.options.srcDir, src)}`);
    return;
  }

  await fsExtra.ensureDir(path.dirname(dstFile));
  await fsExtra.writeFile(dstFile, content);
  consola.info(`Ejected ${path.relative(nuxt.options.srcDir, dstFile)}`);
}
async function ejectTheme(nuxt, options, discoveryPath) {
  // TODO: prevent appending the same theme.css more than once
  const content = await fsExtra.readFile(path.join(discoveryPath, 'theme.css'));

  if (!content) {
    consola.warn(`Reading from theme.css returned empty content, eject aborted`);
    return;
  }

  const dstFile = path.join(nuxt.options.rootDir, 'nuxt.press.css');
  await fsExtra.appendFile(dstFile, content);
  consola.info(`Ejected to ./nuxt.press.css`);
}

class Commands {
  static async eject(args, nuxt, options) {
    const {
      dir,
      autodiscover: autodiscoverOptions,
      blueprints,
      normalizeInput = str => str.includes('/') || str.endsWith('s') ? str : `${str}s`
    } = options;
    let templates = options.templates;
    let discoveryPath = dir;
    let typeKey = args[0] || '';
    let blueprint;

    if (!typeKey) {
      consola.fatal(`A template key identifying the template you wish to eject is required`);
      return;
    }

    if (blueprints) {
      [blueprint, typeKey] = args[0].split('/');
      discoveryPath = blueprints[blueprint];

      if (!discoveryPath) {
        consola.fatal(`Unrecognized blueprint '${blueprint}'`);
        return;
      }
    }

    if (!discoveryPath || !(await exists(discoveryPath))) {
      consola.fatal(`Blueprint path '${discoveryPath}' is empty or does not exists`);
      return;
    }

    if (!templates) {
      templates = await Blueprint.autodiscover(discoveryPath, autodiscoverOptions);

      if (!templates) {
        consola.fatal(`Unrecognized blueprint path, autodiscovery failed for '${discoveryPath}'`);
        return;
      }
    } // normalize key


    if (typeof normalizeInput === 'function') {
      typeKey = normalizeInput(typeKey);
    }

    if (typeKey === 'theme' || typeKey === 'themes') {
      await ejectTheme(blueprint);
      return;
    }

    const templatesToEject = [];

    if (templates[typeKey]) {
      templatesToEject.push(...[].concat(templates[typeKey]));
    }

    if (!templatesToEject.length) {
      for (const type in templates) {
        const templateToEject = templates[type].find(t => t.dst === typeKey);

        if (templateToEject) {
          templatesToEject.push(templateToEject);
          break;
        }
      }
    }

    if (!templatesToEject.length) {
      // show a prompt so user can select for a list
      const choices = [];

      for (const type in templates) {
        const templateChoices = templates[type].map((t, i) => ({
          name: t.dst,
          value: [type, i]
        }));
        choices.push(...templateChoices);
      }

      const answers = await inquirer.prompt([{
        type: 'checkbox',
        name: 'templates',
        message: 'Unrecognized template key, please select the files you wish to eject:\n',
        choices,
        pageSize: 15
      }]);

      if (!answers.templates.length) {
        consola.fatal(`Unrecognized template key '${typeKey}'`);
        return;
      }

      for (const [type, index] of answers.templates) {
        templatesToEject.push(templates[type][index]);
      }
    }

    await ejectTemplates(nuxt, options, templatesToEject);
  }

}

const {
  common
} = cliEdge.options;
async function runCommand(options = {}) {
  const {
    name = 'blueprint',
    description
  } = options;
  await cliEdge.NuxtCommand.run({
    name,
    description: description || `CLI for ${name}`,
    usage: `${name} <blueprint-name> <cmd>`,
    options: { ...common
    },

    async run(cmd) {
      // remove argv's so nuxt doesnt pick them up as rootDir
      const [command = '', ...args] = cmd.argv._.splice(0, cmd.argv._.length);

      if (!command || !Commands[command]) {
        consola.fatal(`Unrecognized command '${command}'`);
        return;
      }

      const config = await cmd.getNuxtConfig();
      const nuxt = await cmd.getNuxt(config);
      return Commands[command](args, nuxt, options);
    }

  });
}

Object.defineProperty(exports, 'access', {
  enumerable: true,
  get: function () {
    return fsExtra.access;
  }
});
Object.defineProperty(exports, 'copyFile', {
  enumerable: true,
  get: function () {
    return fsExtra.copyFile;
  }
});
Object.defineProperty(exports, 'ensureDir', {
  enumerable: true,
  get: function () {
    return fsExtra.ensureDir;
  }
});
Object.defineProperty(exports, 'readFile', {
  enumerable: true,
  get: function () {
    return fsExtra.readFile;
  }
});
exports.Blueprint = Blueprint;
exports.abstractGuard = abstractGuard;
exports.createFileFilter = createFileFilter;
exports.exists = exists;
exports.run = runCommand;
exports.runOnceGuard = runOnceGuard;
exports.runOnceGuardBlocking = runOnceGuardBlocking;
exports.ucfirst = ucfirst;
exports.walk = walk;
