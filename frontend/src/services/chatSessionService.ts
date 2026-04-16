import { supabase } from '../lib/supabase';
import type { ChatMessage } from '../store/playgroundStore';

const TABLE = 'chat_sessions';

/**
 * Save the full chat history for a given automation to Supabase.
 * Uses upsert so it creates or updates in one call.
 */
export async function saveChatSession(automationId: string, messages: ChatMessage[]): Promise<void> {
  if (!automationId || messages.length === 0) {
    console.warn('[ChatSession] Skip save: no ID or no messages.');
    return;
  }

  console.log(`[ChatSession] Saving ${messages.length} messages for ID: ${automationId}`);
  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        automation_id: automationId,
        messages: JSON.parse(JSON.stringify(messages)), // clean serialization
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'automation_id' }
    );
    if (error) throw error;
    console.log(`[ChatSession] Successfully saved ${messages.length} messages for ${automationId}.`);
  } catch (err) {
    console.error('[ChatSession] Failed to save:', err);
  }
}

/**
 * Load previous chat history for a given automation from Supabase.
 */
export async function loadChatSession(automationId: string): Promise<ChatMessage[]> {
  if (!automationId) return [];

  console.log(`[ChatSession] Loading messages for ID: ${automationId}`);
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('messages')
      .eq('automation_id', automationId)
      .maybeSingle();

    if (error || !data) return [];
    return (data.messages as ChatMessage[]) || [];
  } catch (err) {
    console.error('[ChatSession] Failed to load:', err);
    return [];
  }
}
