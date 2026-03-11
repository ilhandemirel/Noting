import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Note extends Model {
    static table = 'notes';

    @field('title') title: string;
    @field('content') content: string;
    @field('reminder_date') reminderDate?: number;
    @field('remote_id') remoteId?: string;
    @field('is_synced') isSynced: boolean;
    @readonly @date('created_at') createdAt: Date;
    @readonly @date('updated_at') updatedAt: Date;
}
