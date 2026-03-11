import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
    version: 2, // Incremented to force DB wipe and apply new scheme
    tables: [
        tableSchema({
            name: 'notes',
            columns: [
                { name: 'title', type: 'string' },
                { name: 'content', type: 'string' }, // Store JSON as string
                { name: 'reminder_date', type: 'number', isOptional: true },
                { name: 'remote_id', type: 'string', isOptional: true }, // PocketBase ID
                { name: 'is_synced', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
    ],
});
