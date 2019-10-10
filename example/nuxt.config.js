export default {
  mode: 'spa',

  modules: [
    '@nuxtjs/axios',
    ['@@/..', {
      // A unique globalName is required to prevent
      // collision with other Nuxt apps
      name: 'customElementExample',
      elementName: 'custom-element-example',
      props: [ 'path' ]
    }]
  ],

  features: {
    store: false,
    layouts: false,
    meta: false,
    middleware: false,
    transitions: false,
    deprecations: false,
    validate: false,
    asyncData: false,
    fetch: false,
    clientOnline: false,
    clientPrefetch: false,
    clientUseUrl: true,
    componentAliases: false,
    componentClientOnly: false
  },

  build: {
    extractCSS: true,
    terser: false,
    devMiddleware: {
      writeToDisk: true
    },
    extend (config, { isDev }) {
      config.devtool = isDev ? 'cheap-module-eval-source-map' : false
    }
  }
}
