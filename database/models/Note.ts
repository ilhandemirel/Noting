import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';

export default class Note extends Model {
    static table = 'notes';

    static associations = {
        folders: { type: 'belongs_to' as const, key: 'folder_id' },
    };

    @field('title') title: string;
    @field('content') content: string;
    @field('folder_id') folderId: string | null;
    @date('reminder_date') reminderDate: Date | null;
    @field('remote_id') remoteId: string | null;
    @field('is_synced') isSynced: boolean;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;

    @relation('folders', 'folder_id') folder: any;
}
