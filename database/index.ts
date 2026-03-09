import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import Folder from './models/Folder';
import Note from './models/Note';

const adapter = new LokiJSAdapter({
    schema,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    onSetUpError: (error: any) => {
        // Schema version changed — reset database (data will re-sync from PocketBase)
        console.warn('[DB] Setup error, database will be reset:', error);
    },
});

const database = new Database({
    adapter,
    modelClasses: [Folder, Note],
});

export default database;
