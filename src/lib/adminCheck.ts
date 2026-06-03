import { supabase, isSupabaseConfigured } from './supabaseClient';

export async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    if (error || !data) return false;
    return data.role === 'admin';
  } catch {
    return false;
  }
}
