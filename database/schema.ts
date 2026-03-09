import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
    version: 3,
    tables: [
        tableSchema({
            name: 'folders',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'remote_id', type: 'string', isOptional: true },
                { name: 'is_synced', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'notes',
            columns: [
                { name: 'title', type: 'string' },
                { name: 'content', type: 'string' },
                { name: 'folder_id', type: 'string', isOptional: true, isIndexed: true },
                { name: 'reminder_date', type: 'number', isOptional: true },
                { name: 'remote_id', type: 'string', isOptional: true },
                { name: 'is_synced', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
    ],
});
