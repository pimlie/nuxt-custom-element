#!/usr/bin/env node

// this is a dirty trick
const fs = require('fs-extra')
const path = require('path')

function main() {
  // dirty trick to have a blueprint dist file which uses nuxt-edge instead of nuxt
  // because nuxt still has SPA issue
  return fs.copy(path.resolve(__dirname, 'blueprint.js'), require.resolve('@nuxt/blueprints'))
}

main()
