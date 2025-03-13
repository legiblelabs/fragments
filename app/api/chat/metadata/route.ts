import { Duration } from '@/lib/duration'
import { getModelClient, getDefaultMode } from '@/lib/models'
import { LLMModel, LLMModelConfig } from '@/lib/models'
import { toPrompt } from '@/lib/prompt'
import ratelimit from '@/lib/ratelimit'
import { fragmentMetadataSchema } from '@/lib/fragmentMetadataSchema'
import { Templates } from '@/lib/templates'
import { streamObject, LanguageModel, CoreMessage } from 'ai'
import { NextRequest } from 'next/server'

export const maxDuration = 60

const rateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
  ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
  : 10
const ratelimitWindow = process.env.RATE_LIMIT_WINDOW
  ? (process.env.RATE_LIMIT_WINDOW as Duration)
  : '1d'

export async function POST(req: NextRequest) {
  console.log('POST /api/chat/metadata route hit')
  console.log('Parsing request body...')
  
  try {
    // Read the request body ONCE and store it in requestBody
    const requestBody = await req.json()
    console.log('Request body parsed')
    
    // Destructure values from the already parsed requestBody
    const {
      messages,
      userID,
      template,
      model,
      config,
    }: {
      messages: CoreMessage[]
      userID: string
      template: Templates
      model: LLMModel
      config: LLMModelConfig
    } = requestBody
    
    console.log('Request data processed:', { userID, template, model })

    const limit = !config.apiKey
      ? await ratelimit(
          userID,
          rateLimitMaxRequests,
          ratelimitWindow,
        )
      : false

    if (limit) {
      return new Response('You have reached your request limit for the day.', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.amount.toString(),
          'X-RateLimit-Remaining': limit.remaining.toString(),
          'X-RateLimit-Reset': limit.reset.toString(),
        },
      })
    }

    const { model: modelNameString, apiKey: modelApiKey, ...modelParams } = config
    const modelClient = getModelClient(model, config)

    console.log('Starting metadata stream...')
    console.log('Creating metadata stream with model:', model)

    const metadataStream = await streamObject({
      model: modelClient as LanguageModel,
      schema: fragmentMetadataSchema,
      system: toPrompt(template),
      messages,
      mode: getDefaultMode(model),
      ...modelParams,
    })

    return metadataStream.toTextStreamResponse()
  } catch (error) {
    console.error('Error processing metadata request:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process metadata request', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}