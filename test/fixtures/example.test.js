import path from 'path'
import { buildFixture } from 'test-utils/build'

buildFixture({ dir: path.resolve(__dirname, '../../example'), generate: true })
