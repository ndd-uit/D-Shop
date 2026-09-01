import { createClient } from "@supabase/supabase-js";

let storageClient;
let storageClientKey;

const getSupabaseStorageClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            "SUPABASE_STORAGE_NOT_CONFIGURED"
        );
    }

    const nextClientKey = `${supabaseUrl}:${serviceRoleKey}`;

    if (
        !storageClient ||
        storageClientKey !== nextClientKey
    ) {
        storageClient = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );
        storageClientKey = nextClientKey;
    }

    return storageClient;
};

export { getSupabaseStorageClient };
