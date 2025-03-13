// app/api/chat/code/route.ts
import { Duration } from '@/lib/duration'
import { getModelClient, getDefaultMode } from '@/lib/models'
import { LLMModel, LLMModelConfig } from '@/lib/models'
import { toPrompt } from '@/lib/prompt'
import ratelimit from '@/lib/ratelimit'
import { Templates } from '@/lib/templates'
import { streamText, LanguageModel, CoreMessage } from 'ai'
import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { FragmentMetadataSchema } from '@/lib/fragmentMetadataSchema'

export const maxDuration = 60

const rateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
  ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
  : 10
const ratelimitWindow = process.env.RATE_LIMIT_WINDOW
  ? (process.env.RATE_LIMIT_WINDOW as Duration)
  : '1d'

export async function POST(req: NextRequest) {
  console.log('POST /api/chat/code route hit')
  
  try {
    // Read the request body ONCE
    const requestBody = await req.json()
    console.log('Request body parsed')
    
    // Destructure values from the parsed requestBody
    const {
      messages,
      userID,
      template,
      model,
      config,
      metadata,
    }: {
      messages: CoreMessage[]
      userID: string
      template: Templates
      model: LLMModel
      config: LLMModelConfig
      metadata: FragmentMetadataSchema
    } = requestBody
    
    console.log('Processing code request for user:', userID)
    console.log('Using metadata title:', metadata.title || 'Untitled Fragment')

    // Rate limiting check
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

    // Setup model client
    const { model: modelNameString, apiKey: modelApiKey, ...modelParams } = config
    const modelClient = getModelClient(model, config)

    // Enhance the system prompt with metadata context
    const enhancedSystemPrompt = `
${toPrompt(template)}

I've already generated metadata for this fragment:
${JSON.stringify(metadata, null, 2)}

Now, I need to generate the code implementation. The code should:
1. Match the functionality described in the metadata
2. Be fully executable and error-free
3. Implement all features mentioned in the metadata
4. Only include code, no comments about what the code does
`;

    // Add metadata as context in a new message
    const codeMessages = [
      ...messages,
      {
        role: 'assistant' as const,
        content: `I've analyzed your request and created the following plan:
Title: ${metadata.title || 'Untitled Fragment'}
${metadata.description ? `Description: ${metadata.description}` : ''}
${metadata.commentary ? `\n${metadata.commentary}` : ''}

Now I'll implement the code for this.`,
        id: randomUUID()
      }
    ]
    
    console.log('Starting code generation stream...')
    const result = await streamText({
      model: modelClient as LanguageModel,
      system: enhancedSystemPrompt, 
      messages: codeMessages,
      mode: getDefaultMode(model),
      ...modelParams,
      onError: (error) => {
        console.error('Error in streamText:', error)
      }
    })
    
    // Return the text stream response
    return result.toTextStreamResponse()
    
  } catch (error) {
    console.error('Error processing code request:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process code request', 
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