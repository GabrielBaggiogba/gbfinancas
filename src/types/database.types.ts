// Escrito à mão no formato do `supabase gen types`.
// Para regenerar a partir do projeto ligado:
//   npx supabase gen types typescript --linked > src/types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      lancamentos_diarios: {
        Row: {
          id: string
          user_id: string
          data: string
          valor_receita: number
          valor_despesa: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          data: string
          valor_receita?: number
          valor_despesa?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          data?: string
          valor_receita?: number
          valor_despesa?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type Tabelas = Database['public']['Tables']
export type Tables<T extends keyof Tabelas> = Tabelas[T]['Row']
export type TablesInsert<T extends keyof Tabelas> = Tabelas[T]['Insert']
export type TablesUpdate<T extends keyof Tabelas> = Tabelas[T]['Update']
