import path from 'path'
import { getPort, startBrowser } from 'test-utils'

describe('basic', () => {
  let browser
  let page

  beforeAll(async () => {
    const folder = path.resolve(__dirname, '../../example/dist')
    const port = await getPort()

    browser = await startBrowser({
      globalName: 'customelementexample',
      folder,
      port
    })

    // pass through browser errors, only works with chrome/puppeteer
    browser.setLogLevel(['log', 'info', 'warn', 'error'])
  })

  afterAll(() => browser.close())

  test('open container', async () => {
    jest.spyOn(console, 'log')
    const url = browser.getUrl('/')

    page = await browser.page(url, '#__customelementexample')

    expect(await page.getElementCount('#__customelementexample')).toBe(1)

    expect(await page.getText('#__customelementexample h1')).toBe('Hello World')
    expect(await page.getText('#__customelementexample a')).toBe('About')

    expect(console.log).toHaveBeenCalledTimes(2)
    expect(console.log).toHaveBeenCalledWith('Path prop has value /')
    expect(console.log).toHaveBeenCalledWith('hasAxios? true')
    console.log.mockRestore()
  })

  test('nav /about', async () => {
    await page.navigate('/about')

    expect(await page.getText('#__customelementexample h1')).toBe('About')
    expect(await page.getText('#__customelementexample a')).toBe('Home')
  })
})
