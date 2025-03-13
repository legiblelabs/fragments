import { z } from 'zod'

export const fragmentMetadataSchema = z.object({
  commentary: z.string().describe(`Describe what you're about to do and the steps you want to take for generating the fragment in great detail.`),
  template: z.string().describe('Name of the template used to generate the fragment.'),
  title: z.string().describe('Short title of the fragment. Max 3 words.'),
  description: z.string().describe('Short description of the fragment. Max 1 sentence.'),
  additional_dependencies: z.array(z.string()).describe('Additional dependencies required by the fragment. Do not include dependencies that are already included in the template.'),
  has_additional_dependencies: z.boolean().describe('Detect if additional dependencies that are not included in the template are required by the fragment.'),
  install_dependencies_command: z.string().describe('Command to install additional dependencies required by the fragment.'),
  port: z.number().nullable().describe('Port number used by the resulted fragment. Null when no ports are exposed.'),
  file_path: z.string().describe('Relative path to the file, including the file name.'),
})

export type FragmentMetadataSchema = z.infer<typeof fragmentMetadataSchema>
