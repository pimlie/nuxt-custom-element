module.exports = {
  'plugins': [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-syntax-dynamic-import'
  ],
  'presets': [
    [ '@babel/preset-env', {
      'targets': {
        'node': '8.6'
      }
    }]
  ]
}
