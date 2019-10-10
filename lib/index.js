import CustomElementBlueprint from './blueprint'

export default function nuxtCustomElement (options) {
  options = {
    name: 'customElement',
    ...options
  }

  const customElement = new CustomElementBlueprint(this.nuxt, options)
  return customElement.init()
}
