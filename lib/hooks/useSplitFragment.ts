import { useState, useEffect, useRef } from 'react'
import { experimental_useObject as useObject } from 'ai/react'
import { FragmentMetadataSchema } from '../fragmentMetadataSchema'
import { fragmentMetadataSchema } from '../fragmentMetadataSchema'
import { LLMModel, LLMModelConfig } from '../models'
import { CoreMessage } from 'ai'
import { Templates } from '../templates'

type FragmentParams = {
  userID: string
  messages: CoreMessage[]
  template: Templates
  model: LLMModel
  config: LLMModelConfig
}

export function useSplitFragment() {
  const [code, setCode] = useState<string>('')
  // Instead of using state, use a ref for currentParams to avoid timing issues
  const currentParamsRef = useRef<FragmentParams | null>(null)
  const [isLoadingCode, setIsLoadingCode] = useState(false)
  const metadataCompleteRef = useRef(false)
  const metadataRef = useRef<FragmentMetadataSchema | null>(null)

  // Use Vercel's AI SDK for metadata streaming
  const {
    object: metadata,
    submit: submitMetadata,
    isLoading: isLoadingMetadata,
    error
  } = useObject({
    api: '/api/chat/metadata',
    schema: fragmentMetadataSchema,
    onError: (error) => {
      console.error('Metadata generation error:', error)
      currentParamsRef.current = null
      metadataCompleteRef.current = false
      if (error.message.includes('request limit')) {
        throw new Error('Rate limit exceeded')
      }
    },
    onFinish: ({ object: finishedMetadata, error }) => {
      console.log('Metadata generation finished:', finishedMetadata, 'Error:', error)
      
      if (!error && finishedMetadata && currentParamsRef.current) {
        // Store completed metadata in ref
        metadataRef.current = finishedMetadata as FragmentMetadataSchema
        metadataCompleteRef.current = true
        
        // Start code generation with the params from our ref
        console.log('Starting code generation with finished metadata')
        generateCode({
          ...currentParamsRef.current,
          metadata: finishedMetadata as FragmentMetadataSchema
        })
      } else {
        console.error('Cannot start code generation:', { 
          error, 
          hasMetadata: !!finishedMetadata, 
          hasParams: !!currentParamsRef.current 
        })
      }
    }
  })

  // Keep the metadata ref updated with streaming updates
  useEffect(() => {
    if (metadata) {
      metadataRef.current = metadata as FragmentMetadataSchema
    }
  }, [metadata])

  const generateCode = async (params: FragmentParams & { metadata: FragmentMetadataSchema }) => {
    console.log('Generate code called with params:', params)
    
    if (isLoadingCode) {
      console.log('Already loading code, skipping')
      return
    }
    
    setIsLoadingCode(true)
    setCode('') // Reset code before starting new stream
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    
    try {
      console.log('Making API call to /api/chat/code with payload:', {
        ...params,
        metadata: params.metadata
      })
      
      const response = await fetch('/api/chat/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          metadata: params.metadata
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Code API error: ${response.status} - ${errorText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Create a streaming reader
      reader = response.body.getReader()
      const decoder = new TextDecoder()

      console.log('Starting to read code stream')
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('Code stream complete')
          break
        }

        // Decode the chunk and update code state immediately
        const chunk = decoder.decode(value)
        console.log('Code chunk received, length:', chunk.length)
        setCode(prevCode => prevCode + chunk)
      }
    } catch (err) {
      console.error('Code generation failed:', err)
      // Don't reset code on error - keep what we've got so far
    } finally {
      // Clean up the reader if it exists
      try {
        if (reader) {
          await reader.cancel()
        }
      } catch (e) {
        console.error('Error canceling reader:', e)
      }
      setIsLoadingCode(false)
    }
  }

  const submit = async (params: FragmentParams) => {
    // Reset state
    setCode('')
    metadataCompleteRef.current = false
    metadataRef.current = null

    console.log('Starting fragment generation with params:', params)
    try {
      // Store params in ref to avoid timing issues with state updates
      currentParamsRef.current = params
      
      // Start metadata generation
      console.log('Submitting metadata request...')
      submitMetadata(params)
    } catch (error) {
      console.error('Error starting fragment generation:', error)
      currentParamsRef.current = null
    }
  }

  const stop = () => {
    // Implementation for stopping ongoing requests
    console.log('Stopping fragment generation')
    setIsLoadingCode(false)
    currentParamsRef.current = null
    metadataCompleteRef.current = false
  }

  return {
    metadata,
    code,
    submit,
    stop,
    isLoadingMetadata,
    isLoadingCode,
    error
  }
}