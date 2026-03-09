import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';

export default class Folder extends Model {
    static table = 'folders';

    static associations = {
        notes: { type: 'has_many' as const, foreignKey: 'folder_id' },
    };

    @field('name') name: string;
    @field('remote_id') remoteId: string | null;
    @field('is_synced') isSynced: boolean;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;

    @children('notes') notes: any;
}
