import { z } from 'zod';

export const PluginPublicFetchSchema = z.object({
  url: z.string().min(1).max(8192),
  method: z.enum(['GET', 'HEAD']).default('GET'),
  headers: z.record(z.string().max(100), z.string().max(2000)).default({}),
}).strict();
export type PluginPublicFetchRequest = z.infer<typeof PluginPublicFetchSchema>;
export interface PluginPublicFetchResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: ArrayBuffer;
}
