import path from 'path'
import fsExtra from 'fs-extra'
import webpack from 'webpack'
import consola from 'consola'
import { Blueprint } from '@nuxt/blueprints'
import { isNonEmptyString } from '@nuxt/utils'
import kebabCase from 'lodash.kebabcase'

const logger = consola.withScope('CustomElement')

export default class CustomElementBlueprint extends Blueprint {
  static id = 'customElement'

  constructor (nuxt, options) {
    if (nuxt.options.mode !== 'spa') {
      throw new Error('Nuxt Custom Element module only works with SPA mode')
    }

    options.name = options.name || 'customElementApp'
    if (!isNonEmptyString(options.name) || !/^[a-zA-Z]+$/.test(options.name)) {
      throw new Error('Nuxt Custom Element: options.name needs to be a valid JavaScript identifier')
    }

    const elementName = kebabCase(options.elementName || options.name)

    options = {
      ...options,
      autodiscover: false,
      dir: __dirname,
      elementName,
      filter: ({ dir, ext }) => !!dir && !!ext
    }

    super(nuxt, options)

    // router.base is used throughout nuxt and must evaluate to a proper path
    // so override default Function.prototype.toString to always return '/'
    const base = () => {
      return 'document.location.pathname'
    }
    base.toString = () => '/'

    nuxt.options.globalName = options.name.toLowerCase()
    nuxt.options.customElement = {
      elementName,
      props: options.props || []
    }

    nuxt.options.router.base = base
    nuxt.options.router.mode = 'abstract'

    nuxt.options.build.filenames = {
      ...nuxt.options.build.filenames,
      app: `${options.name}.js`,
      css: `${options.name}.css`
    }

    nuxt.options.build.optimization = {
      ...nuxt.options.build.optimization,
      runtimeChunk: false
    }

    nuxt.options.build.plugins.push(
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1
      })
    )

    const distDir = path.resolve(nuxt.options.srcDir, 'dist')

    nuxt.hook('build:before', async () => {
      try {
        await fsExtra.remove(distDir)
      } catch (err) {
        logger.error(`Could not remove dist dir`, err)
      }
    })

    if (nuxt.options.dev) {
      return
    }

    nuxt.hook('build:done', async () => {
      try {
        await fsExtra.ensureDir(distDir)
        await fsExtra.copy(path.resolve(nuxt.options.buildDir, 'dist/client'), distDir)
        await fsExtra.copy(path.resolve(nuxt.options.buildDir, 'static/app.html'), path.join(distDir, 'index.html'))
      } catch (err) {
        logger.error(`An error occured while copying the dist files`, err)
      }
    })
  }

  async init () {
    this.setup()

    const files = await this.autodiscover()

    await super.init(files)
  }

  getPathPrefix (pathPrefix) {
    return pathPrefix || ''
  }
}
