import { createClient } from "@supabase/supabase-js"

// As chaves ficam no arquivo .env na raiz do projeto
const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, chave)