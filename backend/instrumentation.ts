import { NodeSDK } from '@opentelemetry/sdk-node'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import pino from 'pino'

const ENDPOINT = 'https://ingress.us-east-2.rocketgraph.app'
const API_KEY  = process.env.ROCKETGRAPH_API_KEY ?? ''

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'my-service',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})

const pinoLogger = pino(
  { level: 'debug' },
  pino.transport({
    target: 'pino-opentelemetry-transport',
    options: {
      logRecordProcessorOptions: {
        exporterOptions: {
          protobufExporterOptions: {
            url: `${ENDPOINT}/v1/logs`,
            headers: { Authorization: `Bearer ${API_KEY}` },
          },
        },
      },
    },
  })
)

// console.log/warn/error still print normally; pino ships a copy to Rocketgraph.
function bridgeConsole() {
  const toStr = (a: unknown) => (typeof a === 'string' ? a : JSON.stringify(a))
  const map = [
    { from: 'log',   to: 'info'  },
    { from: 'info',  to: 'info'  },
    { from: 'warn',  to: 'warn'  },
    { from: 'error', to: 'error' },
    { from: 'debug', to: 'debug' },
  ] as const
  for (const { from, to } of map) {
    const orig = console[from].bind(console)
    console[from] = (...args: unknown[]) => {
      orig(...args)
      try { pinoLogger[to](args.map(toStr).join(' ')) } catch {}
    }
  }
}

let started = false
function startSDK() {
  if (started) return
  started = true
  sdk.start()
  bridgeConsole()
  const shutdown = () => sdk.shutdown().finally(() => process.exit(0))
}

// Next.js calls register() automatically — no import needed.
export async function register() { startSDK() }

// Express / plain Node: starts on import.
if (!process.env.NEXT_RUNTIME) { startSDK() }
