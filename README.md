# Nuxt Custom Element

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![Circle CI][circle-ci-src]][circle-ci-href]
[![Codecov][codecov-src]][codecov-href]

> Publish your Nuxt SPA as a vue-custom-element

`nuxt-custom-element` is a Nuxt.js module that uses [`vue-custom-element`](https://github.com/karol-f/vue-custom-element) to publish your Nuxt SPA as a custom element / web-component.

## Example

See the [example](./example) folder for an example project.

To run the example locally, clone this repo, run `yarn install` or `npm i` and then `yarn example` or `npm run example`

## Installation

Install the module package

```bash
$ yarn add nuxt-custom-element

$ npm i nuxt-custom-element
```

Next add the nuxt-custom-element module to your config:

```js
// nuxt.config.js
  mode: 'spa', // this module only works in SPA mode!
  modules: [
    ['nuxt-custom-element', { name: 'my-nuxt-spa' }]
  ]
```

## Options

### `name` *required*
_string_ (default: `customElement`) normally in `dev` mode, dont

The global name of your custom element. This should be a valid javascript identifier as its used as the [`globalName`](https://nuxtjs.org/api/configuration-global-name#the-globalname-property) of your custom element

> Make sure to choose a unique name, if two Nuxt app's have the same globalName that will result in errors

### `elementName`
_string_ (default: _same as name_)

Optional, the name of your custom element. If you want your custom element to have a different name then the Nuxt globalName property

```js
// module options
{ name: 'nce', elementName: 'nuxt-custom-element' }

// results in
window.$nce

<nuxt-custom-element></nuxt-custom-element>
```

### `props`
_array_ (default: `[]`)

Optional, the props that your custom element supports.

```js
// module options
{ props: ['path'] }

<custom-element path="/about"></custom-element>

// pages/index.vue
mounted() {
  console.log('Path prop has value', this.$root.path)
}
```

## How to develop

Just run `nuxt dev`, this module adds a static `index.html` which already has your custom component listed

## How to build

Run `nuxt build` in your project and check the `./dist` folder. The dist folder should contain 3 files, a js file, a css file and an index.html

## Bundle size

Currently the minimum bundle size seems to be ~`180KB`. This includes the basic Nuxt.js app and all polyfills to run your custom element in IE9+

The minimum bundle size was reached by disabling [most Nuxt.js features](https://github.com/nuxt/nuxt.js/blob/dev/packages/config/src/config/_app.js#L63-L77)

## Caveats

- See [vue-custom-element caveats](https://github.com/karol-f/vue-custom-element#caveats) for general remarks
- The Nuxt app is **not** the root component. Instead, it is the first child of the root component. Eg in a default SPA project the Nuxt app has `_uid: 0`, but when using nuxt-custom-element it has `_uid: 1`
- It's advised to be _very careful_ with using `head`. Using `head` will probably effect the parent page as well, not just your custom element

## TODO

- add support to run Nuxt.js as a normal SPA in dev mode (and not always has a custom element)
- randomize globalName?

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-custom-element/latest.svg?style=flat-square
[npm-version-href]: https://npmjs.com/package/nuxt-custom-element

[npm-downloads-src]: https://img.shields.io/npm/dt/nuxt-custom-element.svg?style=flat-square
[npm-downloads-href]: https://npmjs.com/package/nuxt-custom-element

[circle-ci-src]: https://img.shields.io/circleci/project/github/pimlie/nuxt-custom-element.svg?style=flat-square
[circle-ci-href]: https://circleci.com/gh/pimlie/nuxt-custom-element

[codecov-src]: https://img.shields.io/codecov/c/github/pimlie/nuxt-custom-element.svg?style=flat-square
[codecov-href]: https://codecov.io/gh/pimlie/nuxt-custom-element

