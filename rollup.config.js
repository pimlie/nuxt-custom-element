import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import json from 'rollup-plugin-json'
import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import defaultsDeep from 'lodash.defaultsdeep'

const pkg = require('./package.json')

pkg.dependencies = pkg.dependencies || []
const superDependencies = [
  'path',
  'fs-extra',
  'webpack',
  'consola',
  '@nuxt/utils',
  'lodash.kebabcase'
]

const version = pkg.version

const banner = `/**
 * nuxt-custom-element v${version}
 * (c) ${new Date().getFullYear()}
 * - Pim (@pimlie)
 * - All the amazing contributors
 * @license MIT
 */
`

function rollupConfig ({
  plugins = [],
  ...config
}) {
  const replaceConfig = {
    exclude: 'node_modules',
    delimiters: ['', ''],
    values: {
      'dir: __dirname': `dir: path.resolve(__dirname, '..', 'src', 'blueprint')`
    }
  }

  return defaultsDeep({}, config, {
    input: 'src/index.js',
    output: {
      name: 'NuxtCustomElement',
      format: 'umd',
      sourcemap: false,
      banner
    },
    external: superDependencies,
    plugins: [
      json(),
      nodeResolve(),
      replace(replaceConfig),
      babel({
        exclude: "node_modules/**"
      }),
      commonjs()
    ].concat(plugins)
  })
}

export default [
  // common js build
  {
    output: {
      file: pkg.main,
      format: 'cjs'
    },
    external: superDependencies.concat(Object.keys(pkg.dependencies))
  },
  // esm build
  {
    output: {
      file: pkg.module,
      format: 'es'
    },
    external: superDependencies.concat(Object.keys(pkg.dependencies))
  }
].map(rollupConfig)
