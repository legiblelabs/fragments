// Update the declarations for currentTab and setCurrentTab
// Add state for showing the assignment

'use client'

import { AuthDialog } from '@/components/auth-dialog'
import { Chat } from '@/components/chat'
import { ChatInput } from '@/components/chat-input'
import { ChatPicker } from '@/components/chat-picker'
import { ChatSettings } from '@/components/chat-settings'
import { NavBar } from '@/components/navbar'
import { Preview } from '@/components/preview'
import { AuthViewType, useAuth } from '@/lib/auth'
import { Message, MessageText, MessageCode, MessageImage, toAISDKMessages, toMessageImage } from '@/lib/messages'
import { LLMModelConfig, LLMModel } from '@/lib/models'
import modelsList from '@/lib/models.json'
import { FragmentSchema, fragmentSchema as schema } from '@/lib/schema'
import { supabase } from '@/lib/supabase'
import templates, { Templates, TemplateId } from '@/lib/templates'
import { ExecutionResult } from '@/lib/types'
import { DeepPartial } from 'ai'
import { useSplitFragment } from '@/lib/hooks/useSplitFragment'
import { usePostHog } from 'posthog-js/react'
import { SetStateAction, useEffect, useState, useRef } from 'react'
import { useLocalStorage } from 'usehooks-ts'

export default function Home() {
  const [chatInput, setChatInput] = useLocalStorage('chat', '')
  const [files, setFiles] = useState<File[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<'auto' | TemplateId>(
    'auto',
  )
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>(
    'languageModel',
    {
      model: 'claude-3-5-sonnet-latest',
    },
  )

  const filteredModels = modelsList.models.filter((model) => {
    if (process.env.NEXT_PUBLIC_HIDE_LOCAL_MODELS) {
      return model.providerId !== 'ollama'
    }
    return true
  })

  const currentModel = filteredModels.find(
    (model) => model.id === languageModel.model,
  ) as LLMModel | undefined

  const posthog = usePostHog()

  const [result, setResult] = useState<ExecutionResult>()
  const [messages, setMessages] = useState<Message[]>([])
  const [fragment, setFragment] = useState<DeepPartial<FragmentSchema>>()
  const [currentTab, setCurrentTab] = useState<'code' | 'fragment' | 'assignment'>('code')
  const [showAssignment, setShowAssignment] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isAuthDialogOpen, setAuthDialog] = useState(false)
  const [authView, setAuthView] = useState<AuthViewType>('sign_in')
  const [isRateLimited, setIsRateLimited] = useState(false)
  const { session, apiKey } = useAuth(setAuthDialog, setAuthView)
  console.log('Current session:', session)

  const currentTemplate =
    selectedTemplate === 'auto'
      ? templates
      : { [selectedTemplate]: templates[selectedTemplate] }
  const lastMessage = messages[messages.length - 1]
  
  // Track when the code generation is complete to create the sandbox
  const isCodeComplete = useRef(false)

  const { metadata, code, submit, isLoadingMetadata, isLoadingCode, error } = useSplitFragment()
  const isLoading = isLoadingMetadata || isLoadingCode

  // Show assignment iframe in the center of the page when no messages
  const showCenteredAssignment = messages.length === 0

  useEffect(() => {
    if (error?.message?.includes('request limit')) {
      setIsRateLimited(true)
    }
  }, [error])

  useEffect(() => {
    if (metadata) {
      console.log('metadata', metadata)
      posthog.capture('fragment_metadata_generated', {
        template: metadata.template,
      })

      // Update UI with metadata immediately
      const content: MessageText[] = [
        { type: 'text', text: metadata.commentary || '' }
      ]

      const message: Message = {
        role: 'assistant',
        content,
        object: { ...metadata }
      }

      if (!lastMessage || lastMessage.role !== 'assistant') {
        addMessage(message)
      } else {
        setMessage(message, messages.length - 1)
      }

      // Reset the code complete flag when new metadata is received
      isCodeComplete.current = false
    }
  }, [metadata])

  // This effect updates the UI with streaming code as it arrives
  useEffect(() => {
    if (!metadata || !code) return

    // Only show code in the UI if we have some actual content
    if (code.trim().length > 0) {
      // Create partial fragment for display
      const partialFragment = { ...metadata, code }
      
      // Update current message with the latest code
      const content: (MessageText | MessageCode)[] = [
        { type: 'text', text: metadata?.commentary || '' },
        { type: 'code', text: code }
      ]

      const message: Message = {
        role: 'assistant',
        content,
        object: partialFragment
      }
      
      // Update message with current code
      setMessage(message, messages.length - 1)
      
      // Update fragment for preview
      setFragment(partialFragment)

      // Switch to code tab to show streaming code
      if (currentTab !== 'code' && isLoadingCode) {
        setCurrentTab('code')
      }
    }
  }, [code, metadata, isLoadingCode])

  // This effect runs when code generation is complete
  useEffect(() => {
    // Only proceed if we have metadata, code, and we're no longer loading code
    if (metadata && code && !isLoadingCode && !isCodeComplete.current) {
      console.log('Code generation completed, creating sandbox...')
      isCodeComplete.current = true
      
      // Create complete fragment
      const completeFragment = { ...metadata, code }
      
      setIsPreviewLoading(true)
      
      // Send to sandbox
      fetch('/api/sandbox', {
        method: 'POST',
        body: JSON.stringify({
          fragment: completeFragment,
          userID: session?.user?.id,
          apiKey,
        }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Sandbox API error: ${response.status}`)
        }
        return response.json()
      })
      .then(result => {
        console.log('Sandbox created:', result)
        posthog.capture('sandbox_created', { url: result.url })

        setResult(result)
        
        // Update message with sandbox result
        const updatedMessage = { ...lastMessage, result }
        setMessage(updatedMessage, messages.length - 1)
        
        // Automatically switch to fragment preview when sandbox is ready
        setCurrentTab('fragment')
      })
      .catch(error => {
        console.error('Sandbox creation failed:', error)
      })
      .finally(() => {
        setIsPreviewLoading(false)
      })
    }
  }, [code, metadata, isLoadingCode])

  useEffect(() => {
    if (error) return
  }, [error])

  function setMessage(message: Message, index?: number) {
    setMessages((previousMessages) => {
      const updatedMessages = [...previousMessages]
      updatedMessages[index ?? previousMessages.length - 1] = message
      return updatedMessages
    })
  }

  async function handleSubmitAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    console.log('Form submitted')

    if (isLoadingMetadata || isLoadingCode) {
      console.log('Already loading, skipping')
      return
    }

    // When submitting the first message, show the assignment tab in the sidebar
    if (messages.length === 0) {
      setShowAssignment(true)
      // Make sure we're no longer showing the centered assignment
      // The tab will now be in the sidebar
    }

    const content: (MessageText | MessageImage)[] = [{ type: 'text', text: chatInput }]
    const images = await toMessageImage(files)

    if (images.length > 0) {
      images.forEach((image) => {
        content.push({ type: 'image', image })
      })
    }

    const message: Message = {
      role: 'user',
      content,
    }

    const updatedMessages = addMessage(message)

    console.log('Submitting with params:', {
      userID: 'dev-user',
      messages: toAISDKMessages(updatedMessages),
      template: currentTemplate,
      model: currentModel,
      config: languageModel,
    })
    
    // Reset code completion flag
    isCodeComplete.current = false
    
    submit({
      userID: session?.user?.id || 'dev-user',
      messages: toAISDKMessages(updatedMessages),
      template: currentTemplate as Templates,
      model: currentModel!,
      config: languageModel,
    })

    setChatInput('')
    setFiles([])
    setCurrentTab('code')

    posthog.capture('chat_submit', {
      template: selectedTemplate,
      model: languageModel.model,
    })
  }

  function retry() {
    if (session?.user?.id) {
      // Reset code completion flag
      isCodeComplete.current = false
      
      submit({
        userID: session.user.id,
        messages: toAISDKMessages(messages),
        template: currentTemplate as Templates,
        model: currentModel!,
        config: languageModel,
      })
    }
  }

  function addMessage(message: Message) {
    setMessages((previousMessages) => [...previousMessages, message])
    return [...messages, message]
  }

  function handleSaveInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setChatInput(e.target.value)
  }

  function handleFileChange(change: SetStateAction<File[]>) {
    setFiles(change)
  }

  function logout() {
    supabase
      ? supabase.auth.signOut()
      : console.warn('Supabase is not initialized')
  }

  function handleLanguageModelChange(e: LLMModelConfig) {
    setLanguageModel({ ...languageModel, ...e })
  }

  function handleSocialClick(target: 'github' | 'x' | 'discord') {
    if (target === 'github') {
      window.open('https://github.com/e2b-dev/fragments', '_blank')
    } else if (target === 'x') {
      window.open('https://x.com/e2b_dev', '_blank')
    } else if (target === 'discord') {
      window.open('https://discord.gg/U7KEcGErtQ', '_blank')
    }

    posthog.capture(`${target}_click`)
  }

  function stop() {
    // If you have a way to cancel fragment generation, call it here
    // For example: cancelFragmentGeneration()
    console.log('Stopping generation')
  }

  function handleClearChat() {
    stop()
    setChatInput('')
    setFiles([])
    setMessages([])
    setFragment(undefined)
    setResult(undefined)
    setCurrentTab('code')
    setIsPreviewLoading(false)
    isCodeComplete.current = false
    setShowAssignment(false)
  }

  function setCurrentPreview(preview: {
    fragment: DeepPartial<FragmentSchema> | undefined
    result: ExecutionResult | undefined
  }) {
    setFragment(preview.fragment)
    setResult(preview.result)
  }

  function handleUndo() {
    setMessages((previousMessages) => [...previousMessages.slice(0, -2)])
    setCurrentPreview({ fragment: undefined, result: undefined })
    isCodeComplete.current = false
  }

  // Function to show the Assignment tab
  function showAssignmentTab() {
    setShowAssignment(true)
    setCurrentTab('assignment')
  }

  return (
    <main className="flex min-h-screen max-h-screen">
      {supabase && (
        <AuthDialog
          open={isAuthDialogOpen}
          setOpen={setAuthDialog}
          view={authView}
          supabase={supabase}
        />
      )}
      <div className="grid w-full md:grid-cols-2">
        <div
          className={`flex flex-col w-full max-h-full max-w-[800px] mx-auto px-4 overflow-auto ${(fragment || showAssignment) ? 'col-span-1' : 'col-span-2'}`}
        >
          <NavBar
            session={session}
            showLogin={() => setAuthDialog(true)}
            signOut={logout}
            onSocialClick={handleSocialClick}
            onClear={handleClearChat}
            canClear={messages.length > 0}
            canUndo={messages.length > 1 && !isLoading}
            onUndo={handleUndo}
          />
          
          {/* Always show Chat and ChatInput */}
          <Chat
            messages={messages}
            isLoading={isLoading}
            setCurrentPreview={setCurrentPreview}
          />
          
          {/* Display a centered iframe when no chat messages */}
          {showCenteredAssignment && (
            <div className="flex-grow my-6">
              <div className="w-full h-[50vh] border rounded-lg overflow-hidden">
                <iframe 
                  src="/assignments" 
                  className="w-full h-full border-0"
                  title="Assignment"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>
            </div>
          )}
          
          <ChatInput
            retry={retry}
            isErrored={error !== undefined}
            isLoading={isLoading}
            isRateLimited={isRateLimited}
            input={chatInput}
            handleInputChange={handleSaveInputChange}
            handleSubmit={handleSubmitAuth}
            isMultiModal={currentModel?.multiModal || false}
            files={files}
            handleFileChange={handleFileChange}
          >
            <ChatPicker
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelectedTemplateChange={setSelectedTemplate}
              models={filteredModels}
              languageModel={languageModel}
              onLanguageModelChange={handleLanguageModelChange}
            />
            <ChatSettings
              languageModel={languageModel}
              onLanguageModelChange={handleLanguageModelChange}
              apiKeyConfigurable={!process.env.NEXT_PUBLIC_NO_API_KEY_INPUT}
              baseURLConfigurable={!process.env.NEXT_PUBLIC_NO_BASE_URL_INPUT}
            />
          </ChatInput>
        </div>
        
        <Preview
          apiKey={apiKey}
          selectedTab={currentTab}
          onSelectedTabChange={setCurrentTab}
          isChatLoading={isLoading}
          isPreviewLoading={isPreviewLoading}
          fragment={fragment}
          result={result as ExecutionResult}
          onClose={() => {
            setFragment(undefined);
            setShowAssignment(false);
          }}
          isCodeComplete={!isLoadingCode && !!code}
          showAssignment={showAssignment}
        />
      </div>
    </main>
  )
}